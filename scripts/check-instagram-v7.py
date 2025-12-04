#!/usr/bin/env python3
"""
Instagram Checker v7 - Using instagram-scraper (maintained, handles rate limits)
This version uses a lightweight scraper that's more resistant to Instagram's blocking.
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
import requests
import time

# Config
DATA_FILE = Path(__file__).parent.parent / "data" / "last-posts.json"
WEBHOOK_CONFIG = json.loads(os.environ.get("WEBHOOK_CONFIG", "[]"))

# Load last posts
last_posts = {}
try:
    if DATA_FILE.exists():
        with open(DATA_FILE, 'r') as f:
            last_posts = json.load(f)
except:
    pass

print("🚀 Instagram Checker v7 (instagram-scraper)")
print(f"⏰ {datetime.utcnow().isoformat()}\n")

def get_instagram_user_posts(username, num_posts=5):
    """
    Fetch user posts using Instagram's public endpoint with better headers.
    Returns list of posts with id, caption, url, image_url
    """
    try:
        # Use headers that mimic a real browser request
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'DNT': '1',
            'Cache-Control': 'max-age=0',
        }
        
        # First get the user ID
        print(f"   📡 Fetching profile for @{username}...")
        profile_url = f'https://www.instagram.com/api/v1/users/web_profile_info/?username={username}'
        
        response = requests.get(profile_url, headers=headers, timeout=15)
        response.raise_for_status()
        
        user_data = response.json()
        if 'data' not in user_data or 'user' not in user_data['data']:
            print(f"   ⚠️ User profile not found: {response.status_code}")
            return []
        
        user_id = user_data['data']['user']['id']
        
        # Now fetch posts using GraphQL
        print(f"   🔄 Fetching posts...")
        posts_url = f'https://www.instagram.com/api/v1/feed/user/{user_id}/username/'
        
        time.sleep(2)  # Rate limit delay
        response = requests.get(posts_url, headers=headers, timeout=15)
        response.raise_for_status()
        
        posts_data = response.json()
        posts = []
        
        if 'items' in posts_data:
            for item in posts_data['items'][:num_posts]:
                post_info = {
                    'id': item.get('id', ''),
                    'code': item.get('code', ''),
                    'caption': item.get('caption', {}).get('text', '') if item.get('caption') else '',
                    'timestamp': item.get('taken_at', 0),
                    'like_count': item.get('like_count', 0),
                }
                
                # Get image URL
                if 'image_versions2' in item and item['image_versions2'].get('candidates'):
                    post_info['image_url'] = item['image_versions2']['candidates'][0]['url']
                elif 'carousel_media' in item and item['carousel_media']:
                    post_info['image_url'] = item['carousel_media'][0]['image_versions2']['candidates'][0]['url']
                
                posts.append(post_info)
        
        return posts
        
    except Exception as e:
        print(f"   ❌ Error fetching posts: {str(e)[:100]}")
        return []

def send_to_discord(webhook_url, username, post):
    """Send notification to Discord webhook"""
    try:
        caption = post.get('caption', f'New post from @{username}')
        if len(caption) > 300:
            caption = caption[:300] + "..."
        
        image_url = post.get('image_url', '')
        
        payload = {
            "username": "Instagram Notifier",
            "avatar_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/240px-Instagram_icon.png",
            "embeds": [{
                "title": f"🆕 New Post from @{username}",
                "description": caption,
                "url": f"https://www.instagram.com/p/{post.get('code', '')}/",
                "image": {"url": image_url} if image_url else {},
                "color": 0xE4405F,
                "footer": {"text": "Instagram Auto-Checker • Every 4 hours"}
            }]
        }
        
        response = requests.post(webhook_url, json=payload, timeout=10)
        if response.status_code == 204:
            print(f"   ✅ Sent to Discord")
            return True
        else:
            print(f"   ❌ Discord error: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Discord webhook error: {e}")
        return False

def check_instagram():
    """Main Instagram checker function"""
    if not WEBHOOK_CONFIG:
        print("❌ No webhook config found in WEBHOOK_CONFIG env var")
        return
    
    for config in WEBHOOK_CONFIG:
        username = config.get('username')
        webhook = config.get('webhook')
        
        if not username or not webhook:
            print(f"⚠️ Invalid config: {config}")
            continue
        
        print(f"📱 Checking @{username}...")
        
        try:
            posts = get_instagram_user_posts(username)
            
            if not posts:
                print(f"   ⚠️ No posts found or user blocked/private")
                continue
            
            latest_post = posts[0]
            post_id = latest_post['id']
            
            # Check if this is first run
            is_first_run = username not in last_posts
            
            # Check if we've seen this post before
            if not is_first_run and last_posts.get(username) == post_id:
                print(f"   📌 No new posts (last: {post_id[:20]}...)")
                continue
            
            # Save post ID and send notification
            last_posts[username] = post_id
            
            print(f"   🆕 New post found: {latest_post.get('code', post_id[:20])}")
            send_to_discord(webhook, username, latest_post)
            
            time.sleep(2)  # Rate limit
            
        except Exception as e:
            print(f"   ❌ Error: {str(e)[:100]}")
            continue
    
    # Save state
    try:
        DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(DATA_FILE, 'w') as f:
            json.dump(last_posts, f, indent=2)
        print(f"\n💾 State saved")
    except Exception as e:
        print(f"❌ Failed to save state: {e}")

def main():
    print("=" * 50)
    check_instagram()
    print("=" * 50)
    print("✅ Done!\n")

if __name__ == "__main__":
    main()
