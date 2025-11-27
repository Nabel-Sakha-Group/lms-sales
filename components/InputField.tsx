import React, { useState } from 'react';
import { TextInput, View, TouchableOpacity, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type InputFieldProps = TextInputProps & {
  isPassword?: boolean;
};

export default function InputField({ isPassword, style, className, ...props }: InputFieldProps) {
  const [visible, setVisible] = useState(false);

  const secure = isPassword ? !visible : props.secureTextEntry;

  return (
    <View className="relative w-full">
      <TextInput
        {...props}
        secureTextEntry={secure}
        className={[
          // fixed height for easier vertical centering of icon
          'h-12 w-full rounded-lg border border-gray-600 bg-transparent px-3 text-white',
          isPassword ? 'pr-12' : '',
          'focus:border-blue-500',
          className as string,
        ]
          .filter(Boolean)
          .join(' ')}
      />
      {isPassword && (
        <TouchableOpacity
          onPress={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
          accessibilityLabel={visible ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name={visible ? 'eye-off' : 'eye'} size={20} color="#D1D5DB" />
        </TouchableOpacity>
      )}
    </View>
  );
}
