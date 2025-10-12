import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getUserProfile } from '@/utils/solana';

export enum UserRole {
  None = 0,
  Producer = 1,
  Processor = 2,
  Distributor = 3,
  Retailer = 4,
  Consumer = 5,
  Regulator = 6,
  Administrator = 7,
}

export interface UserProfile {
  userWallet: string;
  role: UserRole;
  profileHash: number[];
  isApproved: boolean;
  registeredAt: number;
}

interface UserContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  refetchProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  userProfile: null,
  loading: false,
  refetchProfile: async () => {},
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { publicKey, connected } = useWallet();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async () => {
    if (!publicKey || !connected) {
      setUserProfile(null);
      return;
    }

    setLoading(true);
    try {
      const profile = await getUserProfile(publicKey);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [publicKey, connected]);

  return (
    <UserContext.Provider value={{ userProfile, loading, refetchProfile: fetchProfile }}>
      {children}
    </UserContext.Provider>
  );
};
