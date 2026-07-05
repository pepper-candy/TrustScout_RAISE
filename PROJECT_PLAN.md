# TrustScout - Complete Project Plan
## RAISE Hackathon 2026 - Paris

---

## 1. Core Concept & Problem Statement

### The Problem
Social media is flooded with AI-generated content, misinformation, and biased narratives. A single false claim can go viral and shape public opinion before any fact-checking occurs. Existing solutions (Community Notes, DBUNK, TruthLens) are either:
- Centralized (controlled by platforms)
- Reactive (tagged after the damage is done)
- Opaque (users don't know why something is flagged)

### Our Solution
TrustScout is a **crowdsourced truth verification layer** for social media content. Users interact through a frictionless swipe interface (True / Partial / False) to vote on the credibility of posts. A weighted reputation system ensures that **consistently accurate voters** have more influence, while **consistently inaccurate voters** lose influence over time.

### MVP Scope
- **Input Format**: Text-based posts only (no images/videos for hackathon)
- **Reference Model**: Meta's "Threads" as the baseline for how people comment and spread information
- **Goal**: Build a functional prototype that demonstrates the complete user journey:
  1. User sees a post in their feed
  2. User swipes to vote (True / Partial / False)
  3. System calculates a color-coded trust score
  4. System shows a breakdown of who voted (Witnesses vs. Commentators)

---

## 2. User Roles & Reputation System

### Default Role: Commentator
- Weight: 1.0
- Default for all new users
- Standard voting power

### Elevated Role: Witness (Elevated Claim)
- **Trigger**: User long-presses the swipe gesture before voting
- **Purpose**: Signals that the user has **first-hand knowledge** of the event
- **Weight Multiplier**: Depends on user's Accuracy Score
  - Formula: `Final Weight = Base Weight × (1 + Accuracy_Score × 0.25)`
- **UI Feedback**: Haptic feedback + subtle glow animation when long-pressed

### Weight Formula (Full)

```
Base_Weight = 1 + Accuracy_Score
Final_Weight = Base_Weight × (1 + Accuracy_Score × 0.25)   [if Witness]
Final_Weight = Base_Weight                                  [if Commentator]
```

Where:
- `Accuracy_Score` ranges from -0.8 to +4.0
- Initial value: 0.0 (new users start as neutral)
- Minimum weight: 0.2 (users who are always wrong)
- Maximum weight: 5.0 (truth masters)

### Accuracy Score Adjustment

| User Vote | Consensus Verdict | Score Change |
|:---|:---|:---|
| ✅ Matched | ✅ Correct | +0.1 |
| ❌ Mismatched | ❌ Wrong | -0.2 (Penalty) |

**Rationale**: Penalty is stronger than reward to discourage low-effort voting.

---

## 3. Post Classification System

### Why Classify?
Not all content is verifiable. Open-ended debates (e.g., "Should students date?") have no objective truth. If users vote on these, they are expressing opinions, not verifying facts. This pollutes our accuracy score system.

### Classification Categories

| Category | Definition | UI Behavior | Affects Accuracy Score? |
|:---|:---|:---|:---|
| **FACTUAL** | Claims a verifiable event, statistic, or attribution. (e.g., "Mr. Ho resigned from ABC.") | Full swipe UI (True / Partial / False). Color-coded trust score. | ✅ Yes |
| **OPINION** | Subjective preference or ethical judgment. (e.g., "This product is the best.", "Sharing my new Song Lyrics.") | Displays as a **Debate** post. Shows Agree/Disagree percentages (like YouTube likes). | ❌ No |
| **DEBATE** | Open-ended discussion with no objective answer. (e.g., "Should students date?") | Same as OPINION. No trust score. | ❌ No |

### Classification Prompt (Vultr LLM)

```
Classify this post into EXACTLY one category:
- FACTUAL: Claims a verifiable event, statistic, or attribution. Contains references to specific people, places, times, or numbers.
- OPINION: Subjective preference, ethical judgment, or review. No objective verification possible.
- DEBATE: Open-ended discussion question or prompt. No objective right or wrong answer.

Post: "{content}"

Output ONLY the category name: FACTUAL / OPINION / DEBATE
```
---

## 4. Voting System & Trust Score

### 3-Way Swipe Interaction

| Gesture | Meaning | Vote Direction |
|:---|:---|:---|
| **Swipe Right (→)** | True | 1.0 |
| **Swipe Down (↓)** | Partial Truth | 0.5 |
| **Swipe Left (←)** | False | 0.0 |

**Partial Truth Scenario** (Mr. Ho resigned from ABC, but actually from DEF):
- Users who vote "Partial" are rewarded when the consensus becomes "Partial".
- Users who vote "True" (missing the wrong company) or "False" (missing the true resignation) are penalized.

### Trust Score Formula

```
Post_Trust_Score = (Σ Final_Weight × Vote_Direction) / (Σ Final_Weight)
```

Where:
- `Final_Weight` = user's voting weight (based on Accuracy Score + Witness status)
- `Vote_Direction` = 1.0 (True), 0.5 (Partial), 0.0 (False)
- Range: 0.0 to 1.0

### Color Gradient (Visual Feedback)

| Score Range | Color | Meaning |
|:---|:---|:---|
| 0.00 - 0.20 | 🔴 Red | Highly Suspicious |
| 0.21 - 0.40 | 🟠 Orange | Likely False |
| 0.41 - 0.60 | ⚪ Gray | Uncertain / Not Enough Votes |
| 0.61 - 0.80 | 🟢 Light Green | Likely True |
| 0.81 - 1.00 | 🟩 Dark Green | Highly Trustworthy |

**Implementation Note**: Use a dynamic gradient (red → yellow → green) rather than discrete colors for smoother UX.

### Confidence Adjustment (Wilson Score Adaptation)

To handle cases with very few votes (e.g., 1 vote at 100% should NOT show as 100% green):

```
Adjusted_Score = (Trust_Votes + 1) / (Total_Votes + 2) × (Total_Votes / (Total_Votes + 10))
```

**Example**:
- 1 vote at 100% → `(1+1)/(1+2) × (1/11) = 0.66 × 0.09 = 6%` → Gray
- 50 votes at 80% → `(40+1)/(50+2) × (50/60) = 0.78 × 0.83 = 65%` → Green

### Vote Decay (Preventing Echo Chambers)

Older votes should lose some influence over time to prevent "first-mover dictatorship":

- Votes older than 24 hours get a **0.9x multiplier** applied to their weight.
- Implementation: `DECAY_FACTOR = POWER(0.9, FLOOR((NOW() - vote_created_at) / INTERVAL '24 hours'))`
- SQL: `SELECT weight * DECAY_FACTOR AS effective_weight`

---

## 5. Bias Detection & Bot Prevention

### Challenge 1: Astroturfing (Coordinated Attack)
**Problem**: 100 new accounts created within 1 hour flood a post with positive votes.
**Solution**: Semantic Similarity Analysis (via Vultr Embeddings)
- Check if all "positive" comments have >90% embedding similarity
- If yes → Flag as potential bot farm → Display warning: "⚠️ 80% of recent votes show identical phrasing."

### Challenge 2: Legitimate Viral Surge
**Problem**: A real post goes viral on Twitter/X. 100 genuine new users flood in and vote.
**Solution**: Check semantic similarity
- If comments are unique (low embedding similarity) → Organic virality
- If comments are near-identical → Bot farm

### Challenge 3: Silent Majority
**Problem**: 10,000 people read a post, but only 50 vote (0.5%). The 50 voters are extreme activists.
**Solution**: Passive Signal Metric
- Track readership vs. votes ratio.
- If readership > 500 but votes < 50 → Display: "⚠️ Highly controversial. Only 5% of readers voted."
- This contextualizes the trust score.

---

## 6. Edge Cases & Handlers

### Case 1: Shifting Ground (Contextual Truth)
**Scenario**: "Company X CEO resigned." At 9:00 AM it's false. At 11:00 AM it becomes true.
**Solution**: Timestamp Lock
- If the Community Verdict changes by >30% after a fact is updated:
  - Users who voted BEFORE the change get their penalties waived.
  - SQL column: `vote_timestamp` + `consensus_version`
- **Pitch Statement**: "We don't punish users for being correct at the time."

### Case 2: Partial Truth (Mr. Ho Resigned from ABC, actually from DEF)
**Solution**: 3-Way Swipe (True / Partial / False)
- Users who vote "Partial" are the most accurate.
- Users who vote "True" or "False" miss the nuance and are penalized.

### Case 3: Open-Ended Debate (No Truth Value)
**Solution**: Vultr Classifier tags as OPINION or DEBATE
- No voting → No accuracy score impact.
- Display as "Agree/Disagree" poll instead.

### Case 4: First-Mover Dictatorship (Echo Chamber)
**Solution**: Vote Decay (see Section 4)
- Old votes lose 10% weight every 24 hours.
- Encourages recent consensus over early hype.

---

## 7. Database Schema (Supabase)

### Table: `profiles`

| Column | Type | Description |
|:---|:---|:---|
| `id` | UUID (PK) | User ID (linked to Supabase Auth) |
| `username` | TEXT, UNIQUE | Display name |
| `accuracy_score` | FLOAT | Range: -0.8 to +4.0 (initial: 0.0) |
| `total_votes` | INTEGER | Total number of votes cast |
| `correct_votes` | INTEGER | Votes that matched consensus |
| `incorrect_votes` | INTEGER | Votes that mismatched consensus |
| `created_at` | TIMESTAMP | User registration time |

### Table: `posts`

| Column | Type | Description |
|:---|:---|:---|
| `id` | UUID (PK) | Unique post ID |
| `content` | TEXT | The original post text |
| `category` | ENUM | FACTUAL / OPINION / DEBATE |
| `trust_score` | FLOAT | Current trust score (0.0 - 1.0) |
| `total_votes` | INTEGER | Total vote count |
| `consensus_version` | INTEGER | Increments when consensus changes |
| `created_at` | TIMESTAMP | Post creation time |

### Table: `votes`

| Column | Type | Description |
|:---|:---|:---|
| `id` | UUID (PK) | Unique vote ID |
| `post_id` | UUID (FK) | Reference to posts |
| `user_id` | UUID (FK) | Reference to profiles |
| `vote_type` | ENUM | TRUE / PARTIAL / FALSE |
| `is_witness` | BOOLEAN | TRUE if user long-pressed before voting |
| `weight` | FLOAT | Calculated weight (based on accuracy score) |
| `vote_timestamp` | TIMESTAMP | When the vote was cast |
| `consensus_version_at_vote` | INTEGER | Which version of consensus was active |

---

## 8. API Endpoints (Next.js App Router)

### GET `/api/posts`
- **Description**: Fetch feed of posts (paginated)
- **Query Params**: `page`, `limit`, `category` (optional)
- **Returns**: Array of posts with `trust_score`, `total_votes`, `color_code`

### POST `/api/posts`
- **Description**: Create a new post
- **Body**: `{ content: string }`
- **Returns**: Created post object

### POST `/api/votes`
- **Description**: Submit a vote on a post
- **Body**: `{ post_id: string, vote_type: "TRUE"|"PARTIAL"|"FALSE", is_witness: boolean }`
- **Logic**:
  1. Calculate user's current weight
  2. Store vote
  3. Recalculate post's trust score
  4. Recalculate user's accuracy score (if consensus reached)

### GET `/api/posts/:id/breakdown`
- **Description**: Get voting breakdown by role
- **Returns**:
  ```json
  {
    "witnesses": { "true": 5, "partial": 2, "false": 0 },
    "commentators": { "true": 50, "partial": 10, "false": 30 },
    "trust_score": 0.72,
    "color": "#4CAF50"
  }
  ```

### POST `/api/classify`
- **Description**: Classify post content using Vultr LLM
- **Body**: `{ content: string }`
- **Returns**: `{ category: "FACTUAL"|"OPINION"|"DEBATE" }`

---

## 9. UI/UX Specifications

### Feed Card Design
- **Card**: Clean, modern card with rounded corners and subtle shadow
- **Content**: Post text displayed prominently
- **Trust Score**: Color-coded badge (red → green gradient) with percentage
- **Voting Area**: Swipeable card with 3-directional swipe:

```
                     [Swipe Up? - Reserved for future]
[Swipe Left ← False]   [Swipe Down ↓ Partial]   [Swipe Right → True]
```

### Elevated Claim (Witness) Interaction
- **Gesture**: Long-press on the card before swiping
- **Feedback**: 
  - Haptic vibration (if mobile)
  - Subtle golden glow animation around the card
  - Tooltip appears: "🗣️ You're marking this as firsthand knowledge!"

### Color Coding (Trust Score)
- Dynamic gradient from **Red (#FF4444) → Yellow (#FFAA00) → Green (#44FF44)**
- **Display**: Large percentage + colored background glow

### Post Breakdown (Click to Expand)
- Shows:
  - 🔵 Witnesses: 12 votes → 80% Trust
  - 🟠 Commentators: 50 votes → 65% Trust
  - ⚠️ Bias Alert (if detected)

---

## 10. Sponsor Integration Strategy

### Vultr (Required - Core AI)
- **Use**: Serverless Inference API
- **Purpose**: Post classification (FACTUAL vs OPINION vs DEBATE)
- **Also**: Embedding similarity for bot detection
- **Credentials**: `VULTR_API_KEY` (already in .env.local)

### Gradium (Bonus Prize Eligible)
- **Use**: Text-to-Speech (TTS)
- **Purpose**: Optional - "Read Trust Summary" button
- **Implementation**: If user taps "🔊 Listen", Gradium speaks the post content + trust score
- **Credentials**: `GRADIUM_API_KEY` (already in .env.local)
- **Note**: For hackathon MVP, this can be a **demonstration feature** (not fully integrated if time is short)

### Cloudflare (Bonus Prize Eligible)
- **Use**: Deploy to Cloudflare Pages
- **Timing**: After MVP is stable (Sunday morning)
- **Benefit**: Qualifies for $5,000 Cloudflare credit bonus prize

### OpenRouter (Optional - Backup LLM)
- **Use**: Fallback if Vultr API is down
- **Not Required**: Vultr is sufficient for all AI needs

---

## 11. Judging Preparation

### Demo Video Content (1 Minute)
1. **0:00-0:10** - Show the feed. User scrolls through posts.
2. **0:10-0:25** - User swipes RIGHT (True) on a factual post. Score updates to green.
3. **0:25-0:35** - User swipes LEFT (False) on a false post. Score updates to red.
4. **0:35-0:45** - User long-presses and swipes (Elevated Claim). Golden glow appears. Score updates with higher weight.
5. **0:45-0:55** - Show the breakdown popup: "Witnesses vs. Commentators"
6. **0:55-1:00** - Close with the problem statement: "Making truth visible, one swipe at a time."

### Key Talking Points (Pitch)
- "We solve the problem of misinformation without centralized censorship."
- "Our reputation system ensures accuracy is rewarded, not popularity."
- "We handle edge cases: partial truths, evolving facts, and open-ended debates."
- "Built with privacy-first design and scalable architecture."

---

## 12. Development Priorities (P0/P1/P2)

| Priority | Feature | Status |
|:---|:---|:---|
| **P0** | Feed display (list of posts) | ✅ Must have |
| **P0** | 3-Way Swipe voting (True/Partial/False) | ✅ Must have |
| **P0** | Trust Score calculation & Color display | ✅ Must have |
| **P1** | Vultr classification (FACTUAL vs OPINION) | ✅ Should have |
| **P1** | User reputation (Accuracy Score) | ✅ Should have |
| **P1** | Breakdown view (Witnesses vs Commentators) | ✅ Should have |
| **P2** | Elevated Claim (long-press) | ⭐ Nice to have |
| **P2** | Vote decay | ⭐ Nice to have |
| **P2** | Bias detection (semantic similarity) | ⭐ Nice to have |
| **P2** | Gradium TTS voice summary | ⭐ Nice to have |

---

## 13. Development Commands

```bash
# Development
npm run dev

# Type Checking
npx tsc --noEmit

# Build
npm run build

# Add Shadcn Components
npx shadcn@latest add button card avatar badge progress
```

---

## 14. Key Terminology (For AI Consistency)

| Term | Definition |
|:---|:---|
| **Verdict** | The final community consensus (True / Partial / False) |
| **Consensus** | The aggregated result of all votes (weighted by reputation) |
| **Elevated Claim** | A vote marked as "firsthand knowledge" (long-press) |
| **Accuracy Score** | User's historical voting accuracy (-0.8 to +4.0) |
| **Trust Score** | Post's final credibility score (0.0 to 1.0) |
| **Breakdown** | Display of votes split by role (Witness vs Commentator) |
| **Debate** | A post classified as OPINION (no truth value) |

---

## 15. Future Steps (Post-MVP / Beyond Hackathon)

The following features are **not required for the hackathon MVP**. They represent the long-term vision for TrustScout as a production-ready platform. Including this section demonstrates forward-thinking and product maturity to judges.

---

### 15.1 AI-Generated Test Comments (Internal Validation Tool)

#### Why This Matters
To detect bias and ensure the community isn't being manipulated by coordinated campaigns, we need a way to **stress-test our own system**. This is not a public feature—it's an internal validation tool that runs in the background.

#### The Problem It Solves
A small group of high-reputation users could theoretically "capture" the truth consensus. If they all share the same bias (e.g., pro-political party), they could systematically downgrade any post that contradicts their views.

#### The Solution: Autonomous Validation Agent

We inject AI-generated comments into **real posts** (in a controlled environment) to observe how the community reacts. This serves two purposes:
1. **Detects bias** - If the community consistently labels AI-generated "truth" as "false", we identify a bias pattern.
2. **Validates system resilience** - If the AI test comments are quickly flagged by the community, we confirm the system is working.

#### Implementation Strategy (Future)

**Phase 1: Manual Trigger (Admin Dashboard)**
- A button in the admin panel labeled: **"🛠️ Inject AI Test Comments"**
- When clicked:
  1. Select a random post from the feed (with high engagement)
  2. Generate **10 AI-simulated comments** via Vultr LLM (or OpenRouter)
  3. Inject these comments into the post's comment section (with a special "TEST" flag)
  4. Monitor how the community votes on these comments

**Phase 2: Automated Bias Detection**
- When >30% of new accounts on a trending post share 90%+ identical sentiment, the system **auto-injects** test comments to verify if it's organic virality or a bot attack.

#### Technical Implementation (Blueprint)

**Step 1: Comment Generation Prompt (Vultr LLM)**

```
You are a validation AI. Your task is to generate realistic comments on a given social media post.
Generate 5 comments that SUPPORT the post's claim, and 5 comments that REFUTE the post's claim.

Post: "{post_content}"

Rules:
- Each comment should be 2-3 sentences.
- Comments should sound like real humans (varying levels of grammar and vocabulary).
- Include at least one comment that seems "too perfect" (potentially AI-generated).

Output format (JSON):
{
  "supporting": ["comment1", "comment2", "comment3", "comment4", "comment5"],
  "refuting": ["comment6", "comment7", "comment8", "comment9", "comment10"]
}
```

**Step 2: Comment Injection Logic**

```typescript
// /lib/services/testService.ts

interface InjectedComment {
  id: string;
  post_id: string;
  content: string;
  is_test: boolean;  // TRUE for AI-generated
  stance: 'supporting' | 'refuting';
  injected_at: Date;
}

async function injectTestComments(postId: string, content: string) {
  // 1. Generate comments via Vultr
  const comments = await vultrService.generateTestComments(content);
  
  // 2. Inject into database with is_test = TRUE
  for (const comment of [...comments.supporting, ...comments.refuting]) {
    await supabase.from('comments').insert({
      post_id: postId,
      content: comment,
      is_test: true,
      stance: comment.isSupporting ? 'supporting' : 'refuting',
      injected_at: new Date(),
      creator_id: null  // No real user attached
    });
  }
  
  // 3. Log the injection for monitoring
  await supabase.from('test_injection_logs').insert({
    post_id: postId,
    total_comments: comments.supporting.length + comments.refuting.length,
    injected_at: new Date(),
    status: 'pending'
  });
  
  return { success: true, count: comments.supporting.length + comments.refuting.length };
}
```

**Step 3: Monitoring & Alerting Thresholds**

| Threshold | Action |
|:---|:---|
| >60% of test comments voted "True" | ✅ System is healthy - community agrees with AI |
| <30% of test comments voted "True" | ⚠️ Potential bias - community is rejecting truth |
| <10% of test comments voted "True" | 🔴 Bias Alert - manual review recommended |

**Step 4: Admin Dashboard Display**

```
┌─────────────────────────────────────────────────────┐
│ 🛠️ Test Injection Monitor                         │
├─────────────────────────────────────────────────────┤
│ Post: "Mr. Ho resigned from ABC."                  │
│ Injected: 10 comments (5 supporting, 5 refuting)  │
│ Community Voting: 3 ✅, 2 ❌ (supporting)          │
│                    1 ✅, 4 ❌ (refuting)           │
│ Bias Score: 42% (Potential bias detected)         │
│ Status: ⚠️ Needs Review                           │
├─────────────────────────────────────────────────────┤
│ [🔄 Re-run Test]  [📊 Export Report]              │
└─────────────────────────────────────────────────────┘
```

#### Ethical Considerations (For Pitch)

> *"We don't use AI test comments to manipulate users. They are clearly flagged in our database as 'TEST' comments, are never shown in the main feed, and are only used for system validation. Users' votes on these comments don't affect their Accuracy Score—they are blind tests to measure community health."*

#### Bonus Prize Eligibility

- **Vultr**: Uses Vultr LLM for comment generation
- **OpenRouter**: Can use OpenRouter as backup LLM provider
- **Gradium**: Optional - generate speech for test comments (for accessibility)

#### Why This Impresses Judges

| Criterion | How We Score |
|:---|:---|
| **Impact (25%)** | Shows system is resilient to bias, not just a simple voting app |
| **Demo (50%)** | Unique feature most teams won't have |
| **Creativity (15%)** | AI commenting back to test itself is innovative |
| **Pitch (10%)** | Easy to demonstrate with a few clicks in the admin panel |

#### Future Vision Statement

> *"In production, this becomes an autonomous truth guardian. It detects suspicious voting patterns in real-time, automatically injects test comments, and alerts moderators if a community bias is detected. This prevents echo chambers before they form."*

---

### 15.2 Sample Dataset for Testing & Demo

#### Why We Need Sample Data

To **demonstrate the system immediately** without waiting for real users to vote, we pre-populate the database with a controlled dataset. This allows judges to see the full interaction flow the moment they open the app.

#### What the Sample Dataset Contains

| Type | Quantity | Purpose |
|:---|:---|:---|
| **Posts** | 8-10 posts | Cover all categories: Factual (True/False/Partial), Opinion, Debate |
| **Users** | 5-7 users | Different Accuracy Scores (-0.5, 0, 1.0, 2.5, 4.0) to demonstrate weighted voting |
| **Votes** | 15-25 per post | Pre-calculated votes from sample users to show real-time trust scores |

#### Sample Posts (Example Set)

| Post ID | Content | Category | Expected Trust Score |
|:---|:---|:---|:---|
| 1 | "Mr. Ho resigned from ABC Corporation on June 30." | FACTUAL | 0.85 (Green) |
| 2 | "The CEO resigned from ABC. Actually, it was DEF Corp." | FACTUAL | 0.55 (Partial Truth - Gray) |
| 3 | "Global temperatures have risen 1.2°C since 1900." | FACTUAL | 0.92 (Dark Green) |
| 4 | "This product is the best on the market." | OPINION | N/A (Shown as Debate/Agree-Disagree) |
| 5 | "Artificial intelligence will destroy humanity." | OPINION | N/A (Shown as Debate) |
| 6 | "Should students date in secondary school?" | DEBATE | N/A (Shown as Poll) |

## Database Operations (Implementation Guide for Cursor)

### Important: Tables Already Exist!
- All tables (profiles, posts, votes) have been created in Supabase with seed data.
- Cursor should **NOT** create or modify table schemas. Only query/insert/update data.

### Sample User Data (For Reference)
| Username | Accuracy Score | Weight |
|----------|---------------|--------|
| TruthMaster | +4.0 | 5.0 |
| FactChecker | +2.5 | 3.5 |
| BalancedView | +1.2 | 2.2 |
| LocalReporter | +1.8 | 2.8 |
| CuriousMind | +0.5 | 1.5 |
| NewUser2024 | 0.0 | 1.0 |
| Skeptic101 | -0.5 | 0.5 |
| ConspiracyLover | -0.8 | 0.2 |

### Query Example: Get Feed Posts
```sql
SELECT 
  id, 
  content, 
  category, 
  trust_score,
  total_votes,
  CASE 
    WHEN trust_score >= 0.8 THEN 'dark-green'
    WHEN trust_score >= 0.6 THEN 'light-green'
    WHEN trust_score >= 0.4 THEN 'gray'
    WHEN trust_score >= 0.2 THEN 'orange'
    ELSE 'red'
  END as color_code
FROM posts 
WHERE category = 'FACTUAL'
ORDER BY created_at DESC;
```

### Insert Example: Add a New Vote
```sql
-- 1. Get current user's weight from profiles
-- 2. Insert vote into votes table
-- 3. Recalculate post's trust_score
-- 4. Recalculate all voters' accuracy_score
```

### Example Supabase Client Usage
```typescript
// Fetch feed
const { data: posts } = await supabase
  .from('posts')
  .select('*')
  .eq('category', 'FACTUAL')
  .order('created_at', { ascending: false });

// Insert vote
const { error } = await supabase
  .from('votes')
  .insert({
    post_id: postId,
    user_id: currentUserId,
    vote_type: 'TRUE',
    is_witness: false,
    weight: currentUserWeight
  });

// Update trust score (after voting)
await supabase.rpc('recalculate_post_score', { post_id: postId });
```

### User Identity Management (For Demo)

**Approach**: Use browser `localStorage` to store the current user's ID. No login required for MVP.

```typescript
// /lib/auth.ts
const DEMO_USERS = [
  'TruthMaster',
  'FactChecker', 
  'BalancedView',
  'LocalReporter',
  'CuriousMind',
  'NewUser2024',
  'Skeptic101',
  'ConspiracyLover'
];

// Get or set current user
export function getCurrentUserId(): string {
  // Check localStorage
  let userId = localStorage.getItem('trustscout_user_id');
  
  if (!userId) {
    // First visit - randomly assign a user
    const randomUser = DEMO_USERS[Math.floor(Math.random() * DEMO_USERS.length)];
    // Query Supabase to get this user's ID
    // Then store in localStorage
  }
  
  return userId;
}

// Switch user (for demo purposes - optional feature)
export function switchUser(username: string) {
  // Query Supabase for user ID by username
  // Update localStorage
}
```

**Flow**:
1. On first visit, assign a random demo user to the browser.
2. All votes will use this user's ID and weight.
3. No login/signup required for MVP.
4. Different browser sessions get different users (shows weighted voting).

**Why This Works**: It demonstrates the weighted voting system without building a full auth system.

**Pitch Statement**: *"For the hackathon, we pre-seeded 8 users with different reputation scores. Each new visitor automatically becomes one of these users, allowing us to demonstrate how weighted voting works without requiring login."*


---

### 15.3 Future Feature Roadmap

| Phase | Feature | Timeline (Post-Hackathon) |
|:---|:---|:---|
| **Phase 1** | Mobile App (React Native) | 2-4 weeks |
| **Phase 2** | Image/Video Post Support (Multimodal) | 4-6 weeks |
| **Phase 3** | Browser Extension (Chrome/Firefox) | 6-8 weeks |
| **Phase 4** | Social Media Platform Integration (API Plugin) | 8-12 weeks |
| **Phase 5** | AI Test Comment Injection (Autonomous Validation) | 12-16 weeks |
| **Phase 6** | Token/Economic Incentive for Voters | 16-20 weeks |
| **Phase 7** | Fact-Checking Organization Partnerships | 20-24 weeks |

---

*End of Project Plan*