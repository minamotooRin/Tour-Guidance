from flask import Flask, request, jsonify, render_template
from geopy.geocoders import GoogleV3
import requests
import yaml

app = Flask(__name__)

try:
    with open("config.yaml", 'r') as stream:
        config = yaml.safe_load(stream)
except yaml.YAMLError as exc:
    print(exc)
    exit(1)

API_KEY = config['API_KEY']
CSE_ID = config['CSE_ID']
geolocator = GoogleV3(api_key=API_KEY)

def get_directions(api_key, start_lat, start_lng, end_lat, end_lng):
    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin": f"{start_lat},{start_lng}",
        "destination": f"{end_lat},{end_lng}",
        "key": api_key
    }
    response = requests.get(url, params=params)
    return response.json()

def google_search(query, api_key, cse_id):
    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "q": query,
        "key": api_key,
        "cx": cse_id
    }
    response = requests.get(url, params=params)
    return response.json()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_location', methods=['POST'])
def get_location():
    data = request.get_json()
    addresses = data['addresses']
    locations = []
    for address in addresses:
        location = geolocator.geocode(address)
        if location:
            locations.append({'lat': location.latitude, 'lng': location.longitude, 'address': address})

    # Get directions if there are at least two locations
    routes = []
    if len(locations) > 1:
        for i in range(len(locations) - 1):
            start = locations[i]
            end = locations[i + 1]
            directions = get_directions(API_KEY, start['lat'], start['lng'], end['lat'], end['lng'])
            if directions['status'] == 'OK':
                for leg in directions['routes'][0]['legs']:
                    path = []
                    for step in leg['steps']:
                        start_location = step['start_location']
                        end_location = step['end_location']
                        path.append({'lat': start_location['lat'], 'lng': start_location['lng']})
                        path.append({'lat': end_location['lat'], 'lng': end_location['lng']})
                    routes.append(path)

    return jsonify({'locations': locations, 'routes': routes})

@app.route('/get_location_info', methods=['POST'])
def get_location_info():
    data = request.get_json()
    lat = data['lat']
    lng = data['lng']
    location = geolocator.reverse((lat, lng), exactly_one=True)
    if location:
        return jsonify({'name': location.address})
    return jsonify({'name': 'Unknown location'})

@app.route('/search', methods=['GET'])
def search():
    query = request.args.get('query')
    search_results = google_search(query, API_KEY, CSE_ID)
    items = search_results.get('items', [])
    results_html = '<ul>'
    for item in items:
        title = item.get('title')
        link = item.get('link')
        snippet = item.get('snippet')
        results_html += f'<li><a href="{link}" target="_blank">{title}</a><p>{snippet}</p></li>'
    results_html += '</ul>'
    return results_html

if __name__ == '__main__':
    print('Starting Flask app...')
    app.run(debug=True)
