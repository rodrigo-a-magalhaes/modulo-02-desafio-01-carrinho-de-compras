import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productsCart = [...cart];
      const product = productsCart.find(
        product => product.id === productId
      );

      const stock = await api.get<Stock>(`/stock/${productId}`);

      const stockAmount = stock.data.amount;
      const currentAmount = product ? product.amount : 0;
      const amount = currentAmount + 1;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (product) {
        product.amount = amount;
      } else {
        const product = await api.get<Product>(`/products/${productId}`);

        const newProduct = {
          ...product.data,
          amount: 1,
        };
        productsCart.push(newProduct);
      }

      setCart(productsCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(productsCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {

      // Verifica se existe produto no carrinho
      const products = [...cart];
      const productIndex = products.findIndex(product => product.id === productId);

      if (productIndex >= 0) {
        products.splice(productIndex, 1);
        setCart(products);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount
  }: UpdateProductAmount) => {
    try {

      // Verifica se existe produto salvo
      const products = [...cart];
      const product = products.find(product => productId === product.id);

      if (!product) { throw Error(); }

      if (amount <= 0) { throw Error(); }

      // Verifica se existe estoque do produto na base de dados
      const checkStock = await api.get<Stock>(`/stock/${productId}`);

      if (!checkStock.data) { throw Error(); }
      const stoke = checkStock.data;

      // Verifica quantidade no estoque
      if (amount > stoke.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      product.amount = amount;

      setCart(products);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
