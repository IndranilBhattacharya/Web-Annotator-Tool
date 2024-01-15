import { useRef, useState, useEffect, useCallback } from "react";
import { Check, Circle, Square, PenTool, ALargeSmall } from "lucide";
import ThemeProvider from "./components/theme-provider";

const App = () => {
  return (
    <ThemeProvider>
      <main className="p-6 w-full gap-4 flex flex-col items-center"></main>
    </ThemeProvider>
  );
};

export default App;
