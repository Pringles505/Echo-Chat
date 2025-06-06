import React, { useState, useEffect, useRef } from "react";
import { useRive } from "@rive-app/react-canvas";
import animationFile from "./cleankeygeneration2.riv";

export default function SliderAnimation1() {
  const ANIMATION_DURATION = 59;
  const SNAP_POINTS = [11, 19, 29, 39, 49, 59]; // snap points in seconds
  const SNAP_THRESHOLD = 0.8; // how close you need to be to snap
  const SNAP_DELAY = 2; // milliseconds to freeze at snap point

  const [slider, setSlider] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);

  const timeoutRef = useRef(null);
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

  // Update animation frame
  useEffect(() => {
    if (rive && isLoaded) {
      rive.scrub("Timeline 1", slider);
    }
  }, [slider, rive, isLoaded]);

  // Handle scrub input
  const handleSliderChange = (e) => {
    const value = Number(e.target.value);
    if (isSnapping) return; // block movement during snap
    const snap = SNAP_POINTS.find(
      (point) => Math.abs(point - value) <= SNAP_THRESHOLD
    );
    if (snap !== undefined) {
      setIsSnapping(true);
      setSlider(snap); // lock to snap
      timeoutRef.current = setTimeout(() => {
        setIsSnapping(false);
      }, SNAP_DELAY);
    } else {
      setSlider(value);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div style={{ width: "100%", height: "600px" }}>
        <RiveComponent style={{ width: "100%", height: "100%" }} />
      </div>

      <div className="relative w-full mb-4">
        <input
          type="range"
          min="0"
          max={ANIMATION_DURATION}
          step="0.01"
          value={slider}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer transition-all duration-200 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full"
        />

        {/* Display snap labels */}
        <div className="absolute left-0 right-0 top-full flex justify-between mt-1 pointer-events-none">
          {SNAP_POINTS.map((point, idx) => {
            const labels = ["One", "Two", "Three", "Four", "Five", "Six"];
            return (
              <div
                key={point}
                style={{
                  left: `${(point / ANIMATION_DURATION) * 100}%`,
                  transform: "translateX(-50%) rotate(35eg)",
                  transformOrigin: "left",
                  position: "absolute",
                  color: "#fff",
                  fontSize: slider === point ? "1.5rem" : "1rem",
                  whiteSpace: "nowrap",
                  fontWeight: slider === point ? "bold" : "normal",
                }}
              >
                {labels[idx]}
              </div>
            );
          })}
        </div>
      </div>

      {!isLoaded && <p className="text-white mt-2">Loading animation...</p>}
    </div>
  );
}
