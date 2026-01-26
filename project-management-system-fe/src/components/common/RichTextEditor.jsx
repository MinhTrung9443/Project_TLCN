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
    <div className="tiptap-menu-bar">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`icon-button ${editor.isActive("bold") ? "is-active" : ""}`}
        title="Bold"
      >
        <span className="material-symbols-outlined">format_bold</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`icon-button ${editor.isActive("italic") ? "is-active" : ""}`}
        title="Italic"
      >
        <span className="material-symbols-outlined">format_italic</span>
      </button>
      <div className="relative flex items-center">
        <span className="material-symbols-outlined text-neutral-600">format_color_text</span>
        <input
          type="color"
          onInput={(event) => editor.chain().focus().setColor(event.target.value).run()}
          value={editor.getAttributes("textStyle").color || "#000000"}
          title="Text Color"
          className="ml-1 w-8 h-8 cursor-pointer"
        />
      </div>
      <span className="w-px h-6 bg-neutral-300 mx-2"></span>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        className={`icon-button ${editor.isActive({ textAlign: "left" }) ? "is-active" : ""}`}
        title="Align Left"
      >
        <span className="material-symbols-outlined">format_align_left</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        className={`icon-button ${editor.isActive({ textAlign: "center" }) ? "is-active" : ""}`}
        title="Align Center"
      >
        <span className="material-symbols-outlined">format_align_center</span>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        className={`icon-button ${editor.isActive({ textAlign: "right" }) ? "is-active" : ""}`}
        title="Align Right"
      >
        <span className="material-symbols-outlined">format_align_right</span>
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
        class: "prose-mirror-editor",
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
