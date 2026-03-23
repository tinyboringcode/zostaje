"use client";
import { useTour, TOUR_STEPS } from "@/contexts/TourContext";
import { X, ChevronLeft, ChevronRight, MapPin, Lightbulb } from "lucide-react";

export function TourGuide() {
  const { isActive, step, currentStep, totalSteps, next, prev, stop, goTo } = useTour();
  if (!isActive || !step) return null;

  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <>
      {/* Dark overlay */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-[90] pointer-events-none" />

      {/* Tour card - fixed bottom-right */}
      <div className="fixed bottom-6 right-6 z-[100] w-[360px] animate-slide-up">
        <div className="glass rounded-2xl shadow-2xl shadow-black/30 overflow-hidden border border-white/20">
          {/* Progress bar */}
          <div className="h-1 bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">
                Krok {currentStep + 1} z {totalSteps}
              </span>
            </div>
            <button
              onClick={stop}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 pb-4">
            <h3 className="text-base font-bold mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {step.description}
            </p>

            {/* Tip */}
            <div className="flex items-start gap-2 bg-primary/10 rounded-xl p-3 mb-4">
              <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-primary/90 leading-relaxed">{step.tip}</p>
            </div>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-1 mb-4">
              {TOUR_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all ${
                    i === currentStep
                      ? "w-5 h-2 bg-primary"
                      : "w-2 h-2 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={prev}
                disabled={currentStep === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-white/20 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Wstecz
              </button>
              <button
                onClick={next}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                {currentStep < totalSteps - 1 ? (
                  <>Dalej <ChevronRight className="h-3.5 w-3.5" /></>
                ) : (
                  "Zakończ przewodnik ✓"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
