import React from "react";

export const Table = ({ children, className = "" }) => {
  return (
    <div className="w-full overflow-auto">
      <table className={`w-full ${className}`}>{children}</table>
    </div>
  );
};

export const TableHeader = ({ children, className = "" }) => {
  return <thead className={`bg-neutral-50 border-b border-neutral-200 ${className}`}>{children}</thead>;
};

export const TableBody = ({ children, className = "" }) => {
  return <tbody className={`divide-y divide-neutral-200 ${className}`}>{children}</tbody>;
};

export const TableRow = ({ children, onClick, className = "", hoverable = true }) => {
  return (
    <tr
      onClick={onClick}
      className={`
        ${hoverable ? "hover:bg-neutral-50" : ""} 
        ${onClick ? "cursor-pointer" : ""}
        transition-colors duration-150
        ${className}
      `}
    >
      {children}
    </tr>
  );
};

export const TableHead = ({ children, className = "" }) => {
  return <th className={`px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider ${className}`}>{children}</th>;
};

export const TableCell = ({ children, className = "" }) => {
  return <td className={`px-6 py-4 text-sm text-neutral-900 ${className}`}>{children}</td>;
};

export default { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
