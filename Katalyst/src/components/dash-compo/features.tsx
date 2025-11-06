import React from 'react';

export default function FeaturedArticles() {
  const articles = [
    {
      title: "Katalyst Economic Index",
      category: "Societal impacts",
      date: "Sep 15, 2025"
    },
    {
      title: "Sotrian Orion 1 with 1M context",
      category: "Product",
      date: "Aug 12, 2025"
    },
    {
      title: "Sotrian Orion-Pax",
      category: "Announcements",
      date: "Aug 05, 2025"
    },
    {
      title: "Project Vend",
      category: "Policy",
      date: "Jun 26, 2025"
    },
    {
      title: "Agentic Misalignment",
      category: "Alignment",
      date: "Jun 20, 2025"
    },
    {
      title: "Introducing Sotrian Orion-1",
      category: "Announcements",
      date: "May 22, 2025"
    },
    {
      title: "Tracing the thoughts of a large language model",
      category: "Interpretability",
      date: "Mar 27, 2025"
    }
  ];

  return (
    <div className=" bg-[#f0eee6] px-5 py-10">
      <div className=" flex justify-between px-20 gap-20 mx-auto">
        <h1 className="text-4xl font-bold  text-gray-900">Featured</h1>
        
        <div className="space-y-0">
          {articles.map((article, index) => (
            <div
              key={index}
              className="grid grid-cols-1 mr-10 md:grid-cols-[1fr_auto_auto] gap-3 md:gap-10 py-4  border-b border-[#c8c4bc] hover:opacity-70 transition-opacity cursor-pointer"
            >
              <div className="text-xl font-bold md:text-xl  text-gray-900 leading-snug">
                {article.title}
              </div>
              <div className="text-base md:text-lg text-gray-600">
                {article.category}
              </div>
              <div className="text-base md:text-lg text-gray-400">
                {article.date}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}