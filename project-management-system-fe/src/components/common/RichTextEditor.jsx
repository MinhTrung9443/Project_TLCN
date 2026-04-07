import React, { useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import axios from "axios";
import { toast } from "react-toastify";

const MenuBar = ({ editor }) => {
  const fileInputRef = useRef(null);

  if (!editor) {
    return null;
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await axios.post("/api/uploads/image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const { url } = response.data;
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Image upload failed!");
      console.error(error);
    }
  };

  return (
    <div className="flex items-center gap-1 p-2 border-b border-neutral-200 bg-neutral-50">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded hover:bg-neutral-200 transition-colors ${editor.isActive("bold") ? "bg-primary-100 text-primary-700" : "text-neutral-700"}`}
        title="Bold"
      >
        <span className="material-symbols-outlined text-[20px]">format_bold</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded hover:bg-neutral-200 transition-colors ${editor.isActive("italic") ? "bg-primary-100 text-primary-700" : "text-neutral-700"}`}
        title="Italic"
      >
        <span className="material-symbols-outlined text-[20px]">format_italic</span>
      </button>
      <div className="flex items-center gap-1 p-2 rounded hover:bg-neutral-200">
        <span className="material-symbols-outlined text-[20px] text-neutral-600">format_color_text</span>
        <input
          type="color"
          onInput={(event) => editor.chain().focus().setColor(event.target.value).run()}
          value={editor.getAttributes("textStyle").color || "#000000"}
          title="Text Color"
          className="ml-1 w-8 h-8 cursor-pointer rounded"
        />
      </div>
      <span className="w-px h-6 bg-neutral-300 mx-1"></span>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        className={`p-2 rounded hover:bg-neutral-200 transition-colors ${editor.isActive({ textAlign: "left" }) ? "bg-primary-100 text-primary-700" : "text-neutral-700"}`}
        title="Align Left"
      >
        <span className="material-symbols-outlined text-[20px]">format_align_left</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        className={`p-2 rounded hover:bg-neutral-200 transition-colors ${editor.isActive({ textAlign: "center" }) ? "bg-primary-100 text-primary-700" : "text-neutral-700"}`}
        title="Align Center"
      >
        <span className="material-symbols-outlined text-[20px]">format_align_center</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        className={`p-2 rounded hover:bg-neutral-200 transition-colors ${editor.isActive({ textAlign: "right" }) ? "bg-primary-100 text-primary-700" : "text-neutral-700"}`}
        title="Align Right"
      >
        <span className="material-symbols-outlined text-[20px]">format_align_right</span>
      </button>
    </div>
  );
};

const RichTextEditor = ({ value, onChange }) => {
  const contentRef = useRef(value || "");

  const editor = useEditor({
    extensions: [StarterKit, TextAlign.configure({ types: ["heading", "paragraph"] }), Image, TextStyle, Color],
    editorProps: {
      attributes: {
        class: "p-4 min-h-[200px] focus:outline-none prose max-w-none text-neutral-900",
      },
    },
    content: value || "",
    onUpdate: ({ editor }) => {
      // Chỉ lưu vào ref, không gọi onChange ngay
      contentRef.current = editor.getHTML();
    },
    onBlur: ({ editor }) => {
      // Chỉ gọi onChange khi blur (click ra ngoài)
      const newContent = editor.getHTML();
      if (newContent !== value) {
        onChange(newContent);
      }
    },
  });

  // Update editor content khi value prop thay đổi từ bên ngoài
  React.useEffect(() => {
    if (editor && value !== contentRef.current) {
      editor.commands.setContent(value || "");
      contentRef.current = value || "";
    }
  }, [value, editor]);

  return (
    <div className="border border-neutral-300 rounded-lg overflow-hidden focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600 transition-all">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
