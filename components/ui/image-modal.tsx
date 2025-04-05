"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    id: number;
    image: string;
    user: {
      name: string;
      username: string;
      avatar: string;
    };
  } | null;
}

export function ImageModal({ isOpen, onClose, post }: ImageModalProps) {
  if (!post) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden z-[999]">
        <DialogHeader className="sr-only">
          <DialogTitle>Image by {post.user.name}</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-square">
          <Image
            src={post.image}
            alt={`Adventure by ${post.user.name}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.user.avatar} alt={post.user.name} />
              <AvatarFallback>{post.user.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{post.user.name}</p>
              <p className="text-sm text-muted-foreground">
                @{post.user.username}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 