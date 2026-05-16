/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from "react";
import { useAppStore } from "./store/useAppStore";
import { LandingPage } from "./components/LandingPage";
import { AirBoard } from "./components/AirBoard";
import { AnimatePresence, motion } from "motion/react";

export default function App() {
  const { isAirBoardActive } = useAppStore();

  return (
    <>
      <AnimatePresence mode="wait">
        {!isAirBoardActive ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full min-h-screen"
          >
            <LandingPage />
          </motion.div>
        ) : (
          <motion.div
            key="airboard"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-screen overflow-hidden"
          >
            <AirBoard />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
