import React from "react";

const Deviceselection = () => {
  return (
    <nav className="text-white ">
      <div className="flex items-center gap-4">
        <button className="p-4 border-b-2 border-[#E6FC5FB2] ">Router</button>
        <button className="p-4">iATM</button>
        <button className="p-4">iPIAZZA</button>
        <button className="p-4">iZION</button>
        <button className="p-4">Surveillance</button>
        <button className="p-4">+ Add More</button>
      </div>
      <div className="w-full bg-slate-100 h-[1px] opacity-25"></div>
    </nav>
  );
};

export default Deviceselection;
