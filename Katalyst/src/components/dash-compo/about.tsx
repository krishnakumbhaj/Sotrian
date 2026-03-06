import React from 'react'

export default function AnthropicMissionBanner() {
  return (
    <div className="w-full mt-4 bg-[#f0eee6] flex items-center justify-center">
      <div className="max-w-7xl w-full flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 py-8">
        <div className="w-full md:w-1/3 px-4 md:px-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-bold leading-tight text-black">
            At Katalyst, we build AI to serve humanity&apos;s long-term well-being.
          </h1>
        </div>
        <div className="w-full md:w-2/3 px-4 md:px-6 font-light">
          <p className="text-base sm:text-lg md:text-xl leading-relaxed mb-6">
            While no one can foresee every outcome AI will have on society, we do know that designing powerful technologies requires both bold steps forward and intentional pauses to consider the effects.
          </p>

          <p className="text-base sm:text-lg md:text-xl font-light leading-relaxed">
            That&apos;s why we focus on building tools with human benefit at their foundation, like Claude. Through our daily research, policy work, and product design, we aim to show what responsible AI development looks like in practice.
          </p>
        </div>
      </div>
    </div>
  );
}