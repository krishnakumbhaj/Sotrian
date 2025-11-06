import React from 'react'

export default function AnthropicMissionBanner() {
  return (
    <div className="w-full mt-2 h-[400px] bg-[#f0eee6]  flex items-center justify-center">
            <div className=' w-2/6 h-full py-12 px-6'>          
            <h1 className="text-4xl md:text-4xl lg:text-4xl px-10 font-bold leading-tight text-black">
            At Katalyst, we build AI to serve humanity&apos;s long-term well-being.
          </h1>
            </div>
            <div className='w-4/6 h-full font-light py-12 mr-4'>
            <p className="text-lg md:text-3xl leading-relaxed mb-8">
            While no one can foresee every outcome AI will have on society, we do know that designing powerful technologies requires both bold steps forward and intentional pauses to consider the effects.
          </p>
          
          <p className="text-lg md:text-3xl font-light leading-relaxed">
            That&apos;s why we focus on building tools with human benefit at their foundation, like Claude. Through our daily research, policy work, and product design, we aim to show what responsible AI development looks like in practice.
          </p></div>
     
    </div>
  );
}