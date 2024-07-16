$(document).ready(function(){
    var addressHistory = [];
    var coordinates = [];
    var routes = [];
    var searchCache = {}; // 用于缓存搜索结果
    var map = L.map('map').setView([0, 0], 2); // Initialize map with default view
    var currentMarker = null;
    var clickedLocationMarker = null;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // 初始系统消息
    appendMessage('system', 'Hi，准备好你的新旅程了吗？');

    // Handle click on map
    map.on('click', function(e) {
        var latlng = e.latlng;
        getClickedLocationInfo(latlng);
    });

    $('#submit').click(function(){
        var address = $('#address').val();
        if(address) {
            appendMessage('user', address);
            addressHistory.push(address);
            updateItineraryList();
            updateMap();
        }
    });

    $('#itinerary-list').sortable({
        update: function(event, ui) {
            addressHistory = [];
            $('#itinerary-list li').each(function(){
                addressHistory.push($(this).data('address'));
            });
            updateMap();
        }
    });

    function appendMessage(sender, text) {
        var messageClass = sender === 'user' ? 'user-message' : 'system-message';
        var messageBubble = '<div class="' + messageClass + '"><div class="message-text">' + text + '</div></div>';
        $('#messages').append(messageBubble);
        $('#messages').scrollTop($('#messages')[0].scrollHeight);
    }

    function updateItineraryList() {
        $('#itinerary-list').empty();
        addressHistory.forEach(function(address, index){
            $('#itinerary-list').append(
                '<li class="list-group-item d-flex justify-content-between align-items-center" data-address="' + address + '">' +
                address +
                '<button class="btn btn-danger btn-sm ml-2" onclick="removeLocation(' + index + ')">Delete</button>' +
                '</li>'
            );
        });
    }

    window.removeLocation = function(index) {
        addressHistory.splice(index, 1);
        updateItineraryList();
        updateMap();
    };

    function updateMap() {
        if(addressHistory.length === 0) return;

        $.ajax({
            url: '/get_location',
            type: 'POST',
            data: JSON.stringify({addresses: addressHistory}),
            contentType: 'application/json',
            success: function(response){
                if(response.locations.length > 0) {
                    coordinates = response.locations;
                    routes = response.routes;
                    renderMap();
                    appendMessage('system', '已收到请求');
                } else {
                    appendMessage('system', 'Location not found');
                }
            },
            error: function() {
                appendMessage('system', 'Error processing the request');
            }
        });
    }

    function renderMap() {
        // Clear existing layers
        map.eachLayer(function (layer) {
            if (!!layer.toGeoJSON) {
                map.removeLayer(layer);
            }
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        var bounds = [];
        coordinates.forEach(function(coord, index){
            var marker = L.marker([coord.lat, coord.lng]).addTo(map).bindPopup(coord.address).openPopup();
            marker.on('click', function() {
                currentMarker = marker;
                showInfoWindow(coord.address);
            });
            bounds.push([coord.lat, coord.lng]);
        });

        routes.forEach(function(route) {
            var latlngs = route.map(function(coord) {
                return [coord.lat, coord.lng];
            });
            var polyline = L.polyline(latlngs, {color: 'blue'}).addTo(map);
            bounds = bounds.concat(latlngs);
        });

        if(bounds.length > 0) {
            map.fitBounds(bounds);
        }
    }

    window.showInfoWindow = function(address) {
        if (searchCache[address]) {
            $('#info-content').html(searchCache[address]);
            $('#info-title').text(address); // 更新小标题为当前地点的名称
            $('#info-window').css({top: '20px', right: '20px'}).show(); // 显示窗口并设置位置
        } else {
            $.ajax({
                url: '/search',
                type: 'GET',
                data: {query: address},
                success: function(response) {
                    searchCache[address] = response; // 缓存搜索结果
                    $('#info-content').html(response);
                    $('#info-title').text(address); // 更新小标题为当前地点的名称
                    $('#info-window').css({top: '20px', right: '20px'}).show(); // 显示窗口并设置位置
                }
            });
        }
    };

    function getClickedLocationInfo(latlng) {
        $.ajax({
            url: '/get_location_info',
            type: 'POST',
            data: JSON.stringify({lat: latlng.lat, lng: latlng.lng}),
            contentType: 'application/json',
            success: function(response) {
                var locationName = response.name;
                if (clickedLocationMarker) {
                    map.removeLayer(clickedLocationMarker);
                }
                clickedLocationMarker = L.marker([latlng.lat, latlng.lng]).addTo(map).bindPopup(
                    `<div>
                        <strong>${locationName}</strong>
                        <br>
                        <button class="btn btn-primary btn-sm" onclick="addLocation('${locationName}')">Add to path</button>
                        <button class="btn btn-secondary btn-sm" onclick="showInfoWindow('${locationName}')">More info</button>
                    </div>`
                ).openPopup();
            }
        });
    }

    window.addLocation = function(name) {
        addressHistory.push(name);
        updateItineraryList();
        updateMap();
    };

    $('#info-window').draggable();
    $('#close-btn').click(function() {
        $('#info-window').hide();
    });
});
