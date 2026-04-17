'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Sun, Moon, MapPin, Calendar, Clock } from 'lucide-react';

interface CelestialPosition {
  x: number;
  y: number;
  altitude: number;
  azimuth: number;
}

interface CharacterLocation {
  lat: number;
  lng: number;
  name?: string;
}

interface CelestialTrackerProps {
  worldWidth?: number;
  worldHeight?: number;
  locations?: CharacterLocation[];
  selectedCharacter?: CharacterLocation | null;
  onCharacterSelect?: (char: CharacterLocation | null) => void;
}

export const CelestialTrackerView: React.FC<CelestialTrackerProps> = ({
  worldWidth = 360,
  worldHeight = 180,
  locations = [],
  selectedCharacter = null,
  onCharacterSelect = () => {},
}) => {
  // State
  const [timeOfDay, setTimeOfDay] = useState(12); // 0-23 hours
  const [dayOfYear, setDayOfYear] = useState(80); // 0-365 days
  const [viewMode, setViewMode] = useState<'day' | 'year'>('day');
  const [hoveredLocation, setHoveredLocation] = useState<CharacterLocation | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Celestial math functions
  const calculateSunPosition = (dayOfYear: number, hourOfDay: number): CelestialPosition => {
    // Simplified solar calculations
    const dayFraction = dayOfYear / 365;
    const hourFraction = hourOfDay / 24;
    
    // Solar declination (angle from celestial equator)
    const declination = 23.44 * Math.sin((dayFraction * 2 * Math.PI) - Math.PI / 2);
    
    // Hour angle (360 degrees per 24 hours)
    const hourAngle = (hourFraction * 360) - 180;
    
    return {
      x: hourAngle,
      y: declination,
      altitude: Math.max(-90, declination + (hourFraction * 180 - 90)), // Simplified altitude
      azimuth: (hourAngle + 180) % 360,
    };
  };

  // Lunar calculations (simplified - 29.5 day cycle)
  const calculateMoonPosition = (dayOfYear: number, hourOfDay: number): CelestialPosition => {
    const lunarCycle = 29.53; // days
    const dayInLunarCycle = (dayOfYear % lunarCycle) / lunarCycle;
    const hourFraction = hourOfDay / 24;
    
    // Moon's declination varies -28.36 to +28.36 degrees
    const declination = 28.36 * Math.sin((dayInLunarCycle * 2 * Math.PI) - Math.PI / 2);
    
    // Moon's hour angle (slightly ahead of sun)
    const moonOffset = dayInLunarCycle * 360;
    const hourAngle = ((hourFraction + dayInLunarCycle) * 360) - 180;
    
    return {
      x: hourAngle,
      y: declination,
      altitude: Math.max(-90, declination + (hourFraction * 180 - 90)),
      azimuth: (hourAngle + 180) % 360,
    };
  };

  // Generate sine wave track for a celestial body
  const generateTrack = (
    bodyCalculator: (dayOfYear: number, hourOfDay: number) => CelestialPosition,
    dayOfYear: number,
    hourStep: number = 1
  ): Array<[number, number]> => {
    const track: Array<[number, number]> = [];
    for (let hour = 0; hour < 24; hour += hourStep) {
      const pos = bodyCalculator(dayOfYear, hour);
      track.push([pos.x, pos.y]);
    }
    return track;
  };

  // Convert celestial coords to canvas coords
  const celestialToCanvas = (x: number, y: number, width: number, height: number) => {
    const canvasX = ((x + 180) / 360) * width; // -180 to 180 -> 0 to width
    const canvasY = ((90 - y) / 180) * height; // 90 to -90 -> 0 to height
    return [canvasX, canvasY];
  };

  // Draw celestial visualization
  const drawVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const x = (i / 6) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw axis labels
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 6; i++) {
      const x = (i / 6) * width;
      const angle = -180 + i * 60;
      ctx.fillText(angle.toString(), x, height - 5);
    }

    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * height;
      const decl = 90 - i * 45;
      ctx.fillText(decl.toString(), width - 5, y + 4);
    }

    // Generate and draw sun track
    const sunTrack = generateTrack(calculateSunPosition, dayOfYear, 0.5);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    sunTrack.forEach((point, idx) => {
      const [canvasX, canvasY] = celestialToCanvas(point[0], point[1], width, height);
      if (idx === 0) ctx.moveTo(canvasX, canvasY);
      else ctx.lineTo(canvasX, canvasY);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Generate and draw moon track
    const moonTrack = generateTrack(calculateMoonPosition, dayOfYear, 0.5);
    ctx.strokeStyle = '#e0e7ff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    moonTrack.forEach((point, idx) => {
      const [canvasX, canvasY] = celestialToCanvas(point[0], point[1], width, height);
      if (idx === 0) ctx.moveTo(canvasX, canvasY);
      else ctx.lineTo(canvasX, canvasY);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Draw sun bead
    const sunPos = calculateSunPosition(dayOfYear, timeOfDay);
    const [sunX, sunY] = celestialToCanvas(sunPos.x, sunPos.y, width, height);
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Draw moon bead
    const moonPos = calculateMoonPosition(dayOfYear, timeOfDay);
    const [moonX, moonY] = celestialToCanvas(moonPos.x, moonPos.y, width, height);
    ctx.fillStyle = '#e0e7ff';
    ctx.shadowColor = 'rgba(224, 231, 255, 0.6)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Draw position markers if character selected
    if (selectedCharacter) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.6)';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      const altitudeText = `Alt: ${sunPos.altitude.toFixed(1)}°`;
      ctx.fillText(altitudeText, width / 2, 25);
    }
  };

  // Redraw when dependencies change
  useEffect(() => {
    drawVisualization();
  }, [timeOfDay, dayOfYear, selectedCharacter]);

  // Format time display
  const formatTime = () => {
    const hours = Math.floor(timeOfDay);
    const minutes = Math.round((timeOfDay - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatDate = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = Math.floor(dayOfYear / 30.44);
    const dayInMonth = Math.floor(dayOfYear % 30.44) + 1;
    return `${months[monthIndex]} ${dayInMonth}`;
  };

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-amber-400">✦ Celestial Tracker</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('day')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              viewMode === 'day'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Clock size={16} className="inline mr-2" />
            Daily
          </button>
          <button
            onClick={() => setViewMode('year')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              viewMode === 'year'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Calendar size={16} className="inline mr-2" />
            Yearly
          </button>
        </div>
      </div>

      {/* Canvas visualization */}
      <div className="flex-1 bg-slate-900 rounded-lg p-4 border border-slate-700 min-h-96">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="w-full h-full border border-slate-700 rounded bg-slate-950"
        />
      </div>

      {/* Controls */}
      <div className="space-y-4 bg-slate-900 p-4 rounded-lg border border-slate-700">
        {/* Time slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Clock size={16} /> Time of Day
            </label>
            <span className="text-lg font-mono text-amber-300">{formatTime()}</span>
          </div>
          <input
            type="range"
            min="0"
            max="23.99"
            step="0.25"
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Date slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Calendar size={16} /> Day of Year
            </label>
            <span className="text-lg font-mono text-amber-300">{formatDate()}</span>
          </div>
          <input
            type="range"
            min="0"
            max="364"
            step="1"
            value={dayOfYear}
            onChange={(e) => setDayOfYear(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Location selector */}
        {locations.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <MapPin size={16} /> Observer Location
            </label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => onCharacterSelect(null)}
                className={`px-3 py-1 rounded text-sm transition-all ${
                  selectedCharacter === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Global View
              </button>
              {locations.map((loc, idx) => (
                <button
                  key={idx}
                  onMouseEnter={() => setHoveredLocation(loc)}
                  onMouseLeave={() => setHoveredLocation(null)}
                  onClick={() => onCharacterSelect(loc)}
                  className={`px-3 py-1 rounded text-sm transition-all ${
                    selectedCharacter === loc
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {loc.name || `${loc.lat.toFixed(1)}°, ${loc.lng.toFixed(1)}°`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info panel */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 p-4 rounded-lg border border-yellow-500/20 space-y-2">
          <div className="flex items-center gap-2 text-yellow-300 font-semibold">
            <Sun size={18} /> Sun
          </div>
          {(() => {
            const sunPos = calculateSunPosition(dayOfYear, timeOfDay);
            return (
              <div className="text-sm text-slate-300 space-y-1">
                <div>Altitude: <span className="text-yellow-300">{sunPos.altitude.toFixed(1)}°</span></div>
                <div>Azimuth: <span className="text-yellow-300">{sunPos.azimuth.toFixed(1)}°</span></div>
                <div>Declination: <span className="text-yellow-300">{sunPos.y.toFixed(1)}°</span></div>
              </div>
            );
          })()}
        </div>

        <div className="bg-slate-900 p-4 rounded-lg border border-indigo-500/20 space-y-2">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold">
            <Moon size={18} /> Moon
          </div>
          {(() => {
            const moonPos = calculateMoonPosition(dayOfYear, timeOfDay);
            return (
              <div className="text-sm text-slate-300 space-y-1">
                <div>Altitude: <span className="text-indigo-300">{moonPos.altitude.toFixed(1)}°</span></div>
                <div>Azimuth: <span className="text-indigo-300">{moonPos.azimuth.toFixed(1)}°</span></div>
                <div>Declination: <span className="text-indigo-300">{moonPos.y.toFixed(1)}°</span></div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default CelestialTrackerView;
