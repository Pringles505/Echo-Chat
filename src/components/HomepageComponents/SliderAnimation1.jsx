import React, { useState, useEffect, useRef } from "react";
import { useRive } from "@rive-app/react-canvas";
import animationFile from "./cleankeygeneration.riv";

export default function SliderAnimation1() {
  const ANIMATION_DURATION = 37;
  const SNAP_POINTS = [9, 22.1, 29, 32]; // snap points in seconds
  const SNAP_THRESHOLD = 0.8; // how close you need to be to snap
  const SNAP_DELAY = 200; // milliseconds to freeze at snap point

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
      <div className="relative w-full mb-4">
        <input
          type="range"
          min="0"
          max={ANIMATION_DURATION}
          step="0.01"
          value={slider}
          onChange={handleSliderChange}
          className="w-full"
        />
        {/* Display snap points */}
        <div className="absolute left-0 right-0 top-full flex justify-between mt-1 pointer-events-none">
          {SNAP_POINTS.map((point, idx) => (
            <div
              key={point}
              style={{
                left: `${(point / ANIMATION_DURATION) * 100}%`,
                transform: "translateX(-50%)",
                position: "absolute",
                color: "#fff",
                fontSize: "0.9rem",
                fontWeight: slider === point ? "bold" : "normal",
              }}
            >
              ● {point}
            </div>
          ))}
        </div>
      </div>
      <div style={{ width: "100%", height: "600px" }}>
        <RiveComponent style={{ width: "100%", height: "100%" }} />
      </div>
      {!isLoaded && <p className="text-white mt-2">Loading animation...</p>}
    </div>
  );
}
