export default function AICard() {
  return (
    <div className=" bg-[#f0eee6] flex items-center justify-center p-8">
      <div className="max-w-7xl w-full flex gap-8 pl-8">
        {/* Left side - Teal div (2/3 width) */}
        <div className="w-2/3 h-[500px] bg-teal-600 rounded-3xl -ml-16"></div>

        {/* Right side - Quote (1/3 width) */}
        <div className="w-1/3 flex px-6 flex-col justify-center">
          <div className="text-7xl text-gray-800">&quot;</div>
          <p className="text-3xl text-gray-900 leading-tight font-medium">
            When you&apos;re talking to a large language model, what exactly is it that you&apos;re talking to?
          </p>
        </div>
      </div>
    </div>
    
  );
}