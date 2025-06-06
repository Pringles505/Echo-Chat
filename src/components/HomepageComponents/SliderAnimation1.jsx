import React, { useState, useEffect } from "react";
import { useRive } from "@rive-app/react-canvas";
import animationFile from "./cleankeygeneration.riv";

export default function SliderAnimation1() {
  const ANIMATION_DURATION = 37; // seconds
  const [slider, setSlider] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const { rive, RiveComponent } = useRive({
    src: animationFile,
    autoplay: false,
    animations: ["Timeline 1"],
    onLoad: () => {
      setIsLoaded(true);
      if (rive) {
        rive.pause("Timeline 1");
        rive.scrub("Timeline 1", 0);
      }
    },
  });

  useEffect(() => {
    if (rive && isLoaded) {
      rive.scrub("Timeline 1", slider);
    }
  }, [slider, rive, isLoaded]);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <label className="block mb-2 text-sm font-medium text-white">
        Time: {slider.toFixed(2)}s
      </label>
      <input
        type="range"
        min="0"
        max={ANIMATION_DURATION}
        step="0.01"
        value={slider}
        onChange={(e) => setSlider(Number(e.target.value))}
        className="w-full mb-4"
      />
      <div style={{ width: "100%", height: "600px" }}>
        <RiveComponent style={{ width: "100%", height: "100%" }} />
      </div>
      {!isLoaded && <p className="text-white mt-2">Loading animation...</p>}
    </div>
  );
}
