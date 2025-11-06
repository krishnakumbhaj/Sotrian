import React from 'react'

export default function AnthropicCards() {
  return (
    <div className=" bg-[#f0eee6]  flex items-center justify-center p-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 px-8  w-full">
        {/* Card 1 - Core Views on AI Safety */}
        <div className="bg-[#e5ddd1] rounded-3xl p-12 flex flex-col items-start justify-between  aspect-square">
          <div className="flex-1 flex items-center justify-center w-full group">
            <svg viewBox="0 0 200 200" className="w-64 h-64 transition-transform duration-300 group-hover:scale-110">
              {/* Balanced stones illustration */}
              <ellipse cx="100" cy="140" rx="35" ry="30" fill="none" stroke="black" strokeWidth="3"/>
              <ellipse cx="75" cy="110" rx="25" ry="22" fill="none" stroke="black" strokeWidth="3"/>
              <ellipse cx="130" cy="105" rx="18" ry="16" fill="none" stroke="black" strokeWidth="3"/>
              <ellipse cx="95" cy="80" rx="15" ry="13" fill="none" stroke="black" strokeWidth="3"/>
              <circle cx="110" cy="55" r="8" fill="none" stroke="black" strokeWidth="3"/>
              
              {/* Curved lines on left */}
              <path d="M 40 100 Q 50 95 55 85" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round"/>
              <path d="M 45 110 Q 52 105 57 98" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round"/>
              <path d="M 48 120 Q 54 115 58 108" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round"/>
              <path d="M 50 130 Q 56 125 60 118" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round"/>
              
              {/* Curved line on right */}
              <path d="M 150 80 Q 155 70 165 60" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-semibold leading-tight">
              Core Views <br/> cyclpos<br />on AI Safety
            </h2>
          </div>
        </div>

        {/* Card 2 - Katalyst's Responsible Scaling Policy */}
        <div className="bg-[#b8d4d1] rounded-3xl p-12 flex flex-col items-start justify-center aspect-square">
          <div className="flex-1 flex items-center justify-center w-full group">
            <svg viewBox="0 0 200 200" className="w-64 h-64 transition-transform duration-300 group-hover:scale-110">
              {/* Building blocks illustration */}
              <rect x="70" y="120" width="90" height="35" fill="white" stroke="black" strokeWidth="3"/>
              <rect x="90" y="80" width="80" height="35" fill="white" stroke="black" strokeWidth="3"/>
              <rect x="110" y="40" width="60" height="35" fill="white" stroke="black" strokeWidth="3"/>
              
              {/* Hands */}
              <path d="M 30 80 Q 40 75 50 80 Q 55 85 50 90 Q 45 95 40 90" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round"/>
              <path d="M 35 95 Q 42 90 48 95" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round"/>
              <path d="M 38 105 Q 44 100 50 105" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round"/>
              <path d="M 40 115 Q 46 110 52 115" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round"/>
              
              <path d="M 190 110 Q 180 105 170 110 Q 165 115 170 120 Q 175 125 180 120" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round"/>
              <path d="M 185 125 Q 178 120 172 125" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round"/>
              <path d="M 182 135 Q 176 130 170 135" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round"/>
              <path d="M 180 145 Q 174 140 168 145" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-semibold leading-tight">
              Katalyst&apos;s<br />Responsible<br />Scaling Policy
            </h2>
          </div>
        </div>

        {/* Card 3 - Katalyst Academy */}
        <div className="bg-[#c8cce5] rounded-3xl p-12 flex flex-col items-start justify-between aspect-square">
          <div className="flex-1 flex items-center justify-center w-full group ">
            <svg viewBox="0 0 200 200" className="w-64 h-64 transition-transform duration-300 group-hover:scale-110">
              {/* Pyramid/temple structure */}
              <rect x="85" y="60" width="80" height="30" fill="none" stroke="black" strokeWidth="3"/>
              <rect x="75" y="95" width="100" height="30" fill="none" stroke="black" strokeWidth="3"/>
              <rect x="65" y="130" width="120" height="30" fill="none" stroke="black" strokeWidth="3"/>
              
              {/* Steps */}
              <rect x="95" y="95" width="15" height="30" fill="white" stroke="black" strokeWidth="2"/>
              <rect x="115" y="130" width="15" height="30" fill="white" stroke="black" strokeWidth="2"/>
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-semibold leading-tight">
              Katalyst Academy:<br />Learn to build<br />with Sotrian
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}