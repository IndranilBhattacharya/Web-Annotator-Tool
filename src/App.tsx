import { useRef, useState, useEffect, useCallback } from "react";
import { Check, Circle, Square, PenTool, ALargeSmall } from "lucide";
import { Card } from "@/components/ui/card";
import ThemeProvider from "@/components/context/theme-provider";

const App = () => {
  return (
    <ThemeProvider>
      <main className="p-6 w-full gap-4 flex flex-col items-center">
        <Card className="w-full"></Card>
      </main>
    </ThemeProvider>
  );
};

export default App;
