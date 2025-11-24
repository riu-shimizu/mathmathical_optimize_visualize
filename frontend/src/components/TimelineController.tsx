type Props = {
  totalSteps: number;
  currentStep: number;
  isPlaying: boolean;
  playSpeed: number;
  onPlayPause: () => void;
  onStepChange: (step: number) => void;
  onSpeedChange: (speed: number) => void;
};

const TimelineController = ({
  totalSteps,
  currentStep,
  isPlaying,
  onPlayPause,
  onStepChange,
  playSpeed,
  onSpeedChange,
}: Props) => {
  return (
    <div className="timeline-body">
      <div className="left">
        <button className="ghost" onClick={() => onStepChange(0)} disabled={totalSteps === 0}>
          ⏮ Start
        </button>
        <button
          className="primary"
          onClick={onPlayPause}
          disabled={totalSteps === 0}
          style={{ minWidth: 96 }}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          className="ghost"
          onClick={() => onStepChange(totalSteps)}
          disabled={totalSteps === 0}
        >
          ⏭ End
        </button>
      </div>

      <div className="center">
        <input
          type="range"
          min={0}
          max={totalSteps || 0}
          value={currentStep}
          onChange={(e) => onStepChange(Number(e.target.value))}
          className="slider"
        />
        <div className="ticks">
          <span>{currentStep}</span>
          <span>/</span>
          <span>{totalSteps}</span>
        </div>
      </div>

      <div className="right">
        <label className="label">Speed</label>
        <select
          value={playSpeed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="select"
        >
        {[0.5, 1, 2, 4, 16, 64, 256].map((s) => (
          <option key={s} value={s}>
            {s}x
          </option>
        ))}
        </select>
      </div>
    </div>
  );
};

export default TimelineController;
