import { useEffect } from 'react';
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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      //creates a copy of the cart array to preserve immutability
      const newCart = [...cart];

      //searches the seleceted product in cart
      const productExistsInCart = newCart.find(
        (product) => product.id === productId
      );

      const stock = await api.get<Stock>(`/stock/${productId}`);

      const amountInStock = stock.data.amount;

      const productAmountInCart = productExistsInCart
        ? productExistsInCart.amount
        : 0;
      const amount = productAmountInCart + 1;

      if (amount > amountInStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExistsInCart) {
        productExistsInCart.amount = amount;
      } else {
        const product = await api.get<Product>(`/products/${productId}`);

        const newProduct = {
          ...product.data,
          amount: 1,
        };
        newCart.push(newProduct);
      }

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = [...cart];

      const productIndexInCart = newCart.findIndex(
        (product) => product.id === productId
      );

      if (productIndexInCart >= 0) {
        newCart.splice(productIndexInCart, 1);
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stock = await api.get(`/stock/${productId}`);

      if (amount > stock.data.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = [...cart];
      const searchedProduct = newCart.find(
        (product) => product.id === productId
      );

      if (searchedProduct) {
        searchedProduct.amount = amount;
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } else {
        throw Error();
      }
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
