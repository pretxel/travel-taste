"use client";

import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageModal } from "@/components/ui/image-modal";
import { LoginForm } from "@/components/auth/login-form";
import Navigation from "@/components/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";

const SESSION_KEY = "travel_and_taste_session";

const posts = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
    user: {
      name: "John Doe",
      username: "johndoe",
      avatar: "https://i.pravatar.cc/150?img=1",
    },
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
    user: {
      name: "Jane Smith",
      username: "janesmith",
      avatar: "https://i.pravatar.cc/150?img=2",
    },
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05",
    user: {
      name: "Mike Johnson",
      username: "mikejohnson",
      avatar: "https://i.pravatar.cc/150?img=3",
    },
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d",
    user: {
      name: "Sarah Wilson",
      username: "sarahwilson",
      avatar: "https://i.pravatar.cc/150?img=4",
    },
  },
  {
    id: 5,
    image: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e",
    user: {
      name: "David Brown",
      username: "davidbrown",
      avatar: "https://i.pravatar.cc/150?img=5",
    },
  },
  {
    id: 6,
    image: "https://images.unsplash.com/photo-1433086966358-54859d0ed716",
    user: {
      name: "Emily Davis",
      username: "emilydavis",
      avatar: "https://i.pravatar.cc/150?img=6",
    },
  },
  {
    id: 7,
    image: "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1",
    user: {
      name: "Robert Taylor",
      username: "roberttaylor",
      avatar: "https://i.pravatar.cc/150?img=7",
    },
  },
  {
    id: 8,
    image: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07",
    user: {
      name: "Lisa Anderson",
      username: "lisaanderson",
      avatar: "https://i.pravatar.cc/150?img=8",
    },
  },
  {
    id: 9,
    image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e",
    user: {
      name: "Tom Wilson",
      username: "tomwilson",
      avatar: "https://i.pravatar.cc/150?img=9",
    },
  },
  {
    id: 10,
    image: "https://images.unsplash.com/photo-1426604966848-d7adac402bff",
    user: {
      name: "Anna Martinez",
      username: "annamartinez",
      avatar: "https://i.pravatar.cc/150?img=10",
    },
  },
];

export default function Home() {
  const [selectedPost, setSelectedPost] = useState<typeof posts[0] | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem(SESSION_KEY, "true");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(SESSION_KEY);
  };

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <>
      <Navigation onLogout={handleLogout} />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {posts.map((post) => (
            <Card
              key={post.id}
              className="overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setSelectedPost(post)}
            >
              <div className="relative aspect-square">
                <Image
                  src={post.image}
                  alt={`Adventure by ${post.user.name}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <div className="relative h-8 w-8 rounded-full overflow-hidden">
                    <Image
                      src={post.user.avatar}
                      alt={post.user.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{post.user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      @{post.user.username}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <ImageModal
        post={selectedPost}
        isOpen={!!selectedPost}
        onClose={() => setSelectedPost(null)}
      />
    </>
  );
}