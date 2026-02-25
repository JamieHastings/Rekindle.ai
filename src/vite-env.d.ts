/// <reference types="vite/client" />

declare module "*.njk?raw" {
  const content: string;
  export default content;
}
