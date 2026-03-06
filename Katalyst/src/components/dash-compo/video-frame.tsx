export default function AICard() {
  return (
    <div className="bg-[#f0eee6] flex items-center justify-center py-8 px-4">
      <div className="max-w-7xl w-full flex flex-col md:flex-row gap-6 md:gap-8 md:pl-8">
        {/* Left side - Teal div (2/3 width on md+) */}
        <div className="w-full md:w-2/3 h-40 sm:h-56 md:h-72 lg:h-[500px] bg-teal-600 rounded-3xl md:-ml-16"></div>

        {/* Right side - Quote (stacked on small screens) */}
        <div className="w-full md:w-1/3 flex px-2 md:px-6 flex-col justify-center">
          <div className="text-4xl sm:text-5xl md:text-7xl text-gray-800">&quot;</div>
          <p className="text-base sm:text-lg md:text-2xl text-gray-900 leading-tight font-medium mt-4">
            When you&apos;re talking to a large language model, what exactly is it that you&apos;re talking to?
          </p>
        </div>
      </div>
    </div>
  );
}