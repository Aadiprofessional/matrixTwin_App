declare module '@react-native-clipboard/clipboard' {
  const Clipboard: {
    setString: (content: string) => void;
    getString: () => Promise<string>;
  };

  export default Clipboard;
}
