import React from "react";

export const Table = ({ children, className = "", ...props }) => {
  return (
    <div className="w-full overflow-auto">
      <table className={`w-full ${className}`} {...props}>{children}</table>
    </div>
  );
};

export const TableHeader = ({ children, className = "", ...props }) => {
  return <thead className={`bg-neutral-50 border-b border-neutral-200 ${className}`} {...props}>{children}</thead>;
};

export const TableBody = ({ children, className = "", ...props }) => {
  return <tbody className={`divide-y divide-neutral-200 ${className}`} {...props}>{children}</tbody>;
};

export const TableRow = ({ children, onClick, className = "", hoverable = true, ...props }) => {
  return (
    <tr
      onClick={onClick}
      className={`
        ${hoverable ? "hover:bg-neutral-50" : ""} 
        ${onClick ? "cursor-pointer" : ""}
        transition-colors duration-150
        ${className}
      `}
      {...props}
    >
      {children}
    </tr>
  );
};

export const TableHead = ({ children, className = "", ...props }) => {
  return <th className={`px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider ${className}`} {...props}>{children}</th>;
};

export const TableCell = ({ children, className = "", ...props }) => {
  return <td className={`px-6 py-4 text-sm text-neutral-900 ${className}`} {...props}>{children}</td>;
};

export default { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
