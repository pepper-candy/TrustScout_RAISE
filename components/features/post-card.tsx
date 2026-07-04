import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { PostWithColor, VoteType } from "@/types/database"

const COLOR_STYLES: Record<
  NonNullable<PostWithColor["color_code"]>,
  { badge: string; ring: string; label: string }
> = {
  "dark-green": {
    badge: "border-transparent bg-emerald-600 text-white",
    ring: "ring-1 ring-emerald-600/30",
    label: "Highly Trustworthy",
  },
  "light-green": {
    badge: "border-transparent bg-emerald-400 text-emerald-950",
    ring: "ring-1 ring-emerald-400/30",
    label: "Likely True",
  },
  gray: {
    badge: "border-transparent bg-muted text-muted-foreground",
    ring: "ring-1 ring-border",
    label: "Uncertain",
  },
  orange: {
    badge: "border-transparent bg-orange-400 text-orange-950",
    ring: "ring-1 ring-orange-400/30",
    label: "Likely False",
  },
  red: {
    badge: "border-transparent bg-red-500 text-white",
    ring: "ring-1 ring-red-500/30",
    label: "Highly Suspicious",
  },
}

const VOTE_LABELS: Record<VoteType, string> = {
  TRUE: "True",
  PARTIAL: "Partial",
  FALSE: "False",
}

interface PostCardProps {
  post: PostWithColor
  onVote: (voteType: VoteType) => void
  isVoting: boolean
}

export function PostCard({ post, onVote, isVoting }: PostCardProps) {
  const colorStyle = post.color_code ? COLOR_STYLES[post.color_code] : null

  return (
    <Card className={cn("transition-shadow", colorStyle?.ring)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <Badge variant="secondary">{post.category}</Badge>
        {colorStyle ? (
          <Badge className={colorStyle.badge}>
            {Math.round(post.trust_score * 100)}% · {colorStyle.label}
          </Badge>
        ) : (
          <Badge variant="outline">No trust score</Badge>
        )}
      </CardHeader>

      <CardContent>
        <p className="text-base leading-relaxed">{post.content}</p>
        <p className="text-muted-foreground mt-2 text-xs">{post.total_votes} votes</p>
      </CardContent>

      <CardFooter className="flex gap-2">
        {(Object.keys(VOTE_LABELS) as VoteType[]).map((voteType) => (
          <Button
            key={voteType}
            variant={voteType === "TRUE" ? "default" : voteType === "FALSE" ? "destructive" : "outline"}
            size="sm"
            disabled={isVoting}
            onClick={() => onVote(voteType)}
          >
            {VOTE_LABELS[voteType]}
          </Button>
        ))}
      </CardFooter>
    </Card>
  )
}
