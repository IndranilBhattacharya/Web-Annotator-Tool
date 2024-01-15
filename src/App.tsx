import { useRef } from "react";

const App = () => {
  const iframeRef = useRef(null);
  const inputRef = useRef(null);

  const handleButtonClick = () => {
    const url = inputRef.current.value;

    // Load URL into the iframe
    iframeRef.current.src = url;

    // Wait for the iframe to load its content
    iframeRef.current.onload = () => {
      // Access the contentWindow of the iframe
      const contentWindow = iframeRef.current.contentWindow;

      // Create a canvas element
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Set canvas dimensions to match the iframe
      canvas.width = contentWindow.innerWidth;
      canvas.height = contentWindow.innerHeight;

      // Draw the content of the iframe onto the canvas
      ctx.drawWindow(
        contentWindow,
        0,
        0,
        canvas.width,
        canvas.height,
        "rgb(255,255,255)"
      );

      // Now you can use the canvas as needed (e.g., display it, save it, etc.)
      console.log("Canvas created:", canvas);
    };
  };

  return (
    <div>
      <input type="text" ref={inputRef} placeholder="Enter URL" />
      <button onClick={handleButtonClick}>Load URL</button>
      <iframe
        ref={iframeRef}
        title="loaded-content"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />
    </div>
  );
};

export default App;
