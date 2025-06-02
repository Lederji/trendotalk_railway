import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

interface Story {
  id: number;
  user: {
    username: string;
    avatar?: string;
  };
  imageUrl?: string;
  videoUrl?: string;
}

interface StoriesCarouselProps {
  stories: Story[];
}

export function StoriesCarousel({ stories }: StoriesCarouselProps) {
  if (stories.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
          {stories.map((story) => (
            <div
              key={story.id}
              className="flex-shrink-0 flex flex-col items-center cursor-pointer group"
            >
              <div className="gradient-border group-hover:scale-105 transition-transform duration-200">
                <div className="gradient-border-inner p-1">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={story.user.avatar} alt={story.user.username} />
                    <AvatarFallback>
                      {story.user.username[3]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <span className="text-xs text-gray-600 mt-1 truncate max-w-[60px] text-center">
                {story.user.username}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
