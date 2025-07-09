
'use client';

import React, { useState, useCallback } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code } from 'lucide-react';
import { motion } from 'framer-motion';
import { Separator } from '../ui/separator';

interface FocusModeDialogProps {
  initialContent: string;
  onSave: (content: string) => void;
  onClose: () => void;
}

const FocusModeDialog: React.FC<FocusModeDialogProps> = ({ initialContent, onSave, onClose }) => {
  const [content, setContent] = useState(initialContent);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: 'Write something amazing...',
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert focus:outline-none max-w-full',
      },
    },
  });

  const handleSave = () => {
    onSave(content);
  };
  
  if (!editor) {
    return null;
  }

  const dialogVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  };

  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="bg-transparent border-0 shadow-none p-0 flex items-center justify-center w-full h-full max-w-none"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <motion.div
            variants={dialogVariants} 
            initial="hidden" 
            animate="visible" 
            exit="exit" 
            className="w-[95vw] max-w-7xl h-[95vh] flex flex-col p-0 bg-card rounded-lg shadow-2xl"
        >
            <DialogHeader className="p-4 border-b flex-shrink-0">
              <DialogTitle className="font-headline">Focus Mode</DialogTitle>
            </DialogHeader>
            
            <div className="flex-grow overflow-y-auto p-8 md:p-12">
                <EditorContent editor={editor} />
                <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
                    <ToggleGroup type="multiple" className="bg-background border rounded-md shadow-lg p-1">
                        <ToggleGroupItem value="bold" aria-label="Toggle bold" onClick={() => editor.chain().focus().toggleBold().run()} data-active={editor.isActive('bold')}>
                            <Bold className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="italic" aria-label="Toggle italic" onClick={() => editor.chain().focus().toggleItalic().run()} data-active={editor.isActive('italic')}>
                            <Italic className="h-4 w-4" />
                        </ToggleGroupItem>
                         <ToggleGroupItem value="underline" aria-label="Toggle underline" onClick={() => editor.chain().focus().toggleUnderline().run()} data-active={editor.isActive('underline')}>
                            <UnderlineIcon className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="strike" aria-label="Toggle strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()} data-active={editor.isActive('strike')}>
                            <Strikethrough className="h-4 w-4" />
                        </ToggleGroupItem>
                        <Separator orientation="vertical" className="h-6 mx-1" />
                        <ToggleGroupItem value="code" aria-label="Toggle code" onClick={() => editor.chain().focus().toggleCode().run()} data-active={editor.isActive('code')}>
                            <Code className="h-4 w-4" />
                        </ToggleGroupItem>
                    </ToggleGroup>
                </BubbleMenu>
            </div>

            <DialogFooter className="p-4 border-t flex-shrink-0">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Done</Button>
            </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default FocusModeDialog;
