import { SafeAreaView } from 'react-native';

export const Container = ({ children }: { children: React.ReactNode }) => {
  return (
    <SafeAreaView className={styles.container}>
      {children}
    </SafeAreaView>
  );
};

const styles = {
  // White background base with small horizontal padding
  container: 'flex flex-1 bg-white px-4 py-4',
};
