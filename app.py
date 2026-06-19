from flask import Flask, jsonify, render_template, request
import urllib.request
import xml.etree.ElementTree as ET
import re
import time

app = Flask(__name__)

ATOM_NS = {'atom': 'http://www.w3.org/2005/Atom'}
CACHE_DURATION = 300  # Cache for 5 minutes
cache = {
    'data': None,
    'expiry': 0
}

def parse_individual_updates(content_html, date, base_link):
    if not content_html:
        return []
    
    # Matches <h3>Type</h3> followed by content up to the next <h3> or end of string
    pattern = re.compile(r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)', re.DOTALL | re.IGNORECASE)
    matches = list(pattern.finditer(content_html))
    updates = []
    
    for idx, match in enumerate(matches):
        update_type = match.group(1).strip()
        update_body_html = match.group(2).strip()
        
        # Clean up the text content for search and plain text usage
        text_cleaned = re.sub(r'<[^>]+>', '', update_body_html)
        text_cleaned = re.sub(r'\s+', ' ', text_cleaned).strip()
        
        # Formulate Tweet text (Twitter limit is 280 characters)
        tweet_prefix = f"BigQuery Update ({date}) - {update_type}: "
        # 25 characters reserved for URL and spacing
        max_body_len = 280 - len(tweet_prefix) - 25
        
        body_text = text_cleaned
        if len(body_text) > max_body_len:
            body_text = body_text[:max_body_len - 3] + "..."
        
        tweet_text = f"{tweet_prefix}{body_text} {base_link}"
        
        updates.append({
            'id': f"{date.replace(' ', '_').replace(',', '')}-update-{idx}",
            'type': update_type,
            'html': update_body_html,
            'text': text_cleaned,
            'tweet_text': tweet_text
        })
        
    if not updates and content_html.strip():
        text_cleaned = re.sub(r'<[^>]+>', '', content_html)
        text_cleaned = re.sub(r'\s+', ' ', text_cleaned).strip()
        
        tweet_prefix = f"BigQuery Update ({date}): "
        max_body_len = 280 - len(tweet_prefix) - 25
        body_text = text_cleaned
        if len(body_text) > max_body_len:
            body_text = body_text[:max_body_len - 3] + "..."
        
        tweet_text = f"{tweet_prefix}{body_text} {base_link}"
        
        updates.append({
            'id': f"{date.replace(' ', '_').replace(',', '')}-update-0",
            'type': 'Update',
            'html': content_html,
            'text': text_cleaned,
            'tweet_text': tweet_text
        })
        
    return updates

def fetch_and_parse_feed():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        xml_data = response.read()
    
    root = ET.fromstring(xml_data)
    
    entries = []
    for entry_el in root.findall('atom:entry', ATOM_NS):
        title_el = entry_el.find('atom:title', ATOM_NS)
        id_el = entry_el.find('atom:id', ATOM_NS)
        updated_el = entry_el.find('atom:updated', ATOM_NS)
        
        link_el = entry_el.find('atom:link[@rel="alternate"]', ATOM_NS)
        if link_el is None:
            link_el = entry_el.find('atom:link', ATOM_NS)
            
        content_el = entry_el.find('atom:content', ATOM_NS)
        
        date = title_el.text if title_el is not None else ""
        entry_id = id_el.text if id_el is not None else ""
        updated = updated_el.text if updated_el is not None else ""
        link = link_el.attrib.get('href', '') if link_el is not None else ""
        content_html = content_el.text if content_el is not None else ""
        
        updates = parse_individual_updates(content_html, date, link)
        
        entries.append({
            'date': date,
            'id': entry_id,
            'updated': updated,
            'link': link,
            'updates': updates
        })
    return entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    if force_refresh or not cache['data'] or current_time > cache['expiry']:
        try:
            entries = fetch_and_parse_feed()
            cache['data'] = entries
            cache['expiry'] = current_time + CACHE_DURATION
            return jsonify({'success': True, 'data': entries, 'source': 'network'})
        except Exception as e:
            if cache['data']:
                # Return expired data if fetching fails, along with a warning
                return jsonify({
                    'success': True, 
                    'data': cache['data'], 
                    'source': 'cache_fallback', 
                    'warning': f"Failed to refresh: {str(e)}"
                })
            return jsonify({'success': False, 'error': f"Failed to load release notes: {str(e)}"}), 500
            
    return jsonify({'success': True, 'data': cache['data'], 'source': 'cache'})

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
