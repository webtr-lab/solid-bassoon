"""
Place Service Module
Handles places of interest operations and visit analytics
Business logic extracted from routes for reusability and testability
"""

from flask import current_app
from app.models import db, PlaceOfInterest, Vehicle
from app.services.location_service import calculate_distance


def format_place(place):
    """Format place object for JSON response"""
    return {
        'id': place.id,
        'name': place.name,
        'address': place.address,
        'area': place.area,
        'contact': place.contact,
        'telephone': place.telephone,
        'latitude': place.latitude,
        'longitude': place.longitude,
        'category': place.category,
        'description': place.description,
        'created_at': place.created_at.isoformat(),
        'created_by': place.creator.username if place.creator else None
    }


def get_place_or_404(place_id):
    """
    Get a place by ID or return None

    Args:
        place_id: ID of the place

    Returns:
        PlaceOfInterest object or None if not found
    """
    return PlaceOfInterest.query.get(place_id)


def find_place_for_coordinate(latitude, longitude, places=None, threshold_km=0.2):
    """
    Find the closest place within threshold distance for given coordinates

    Args:
        latitude: Location latitude
        longitude: Location longitude
        places: List of PlaceOfInterest objects (if None, queries all)
        threshold_km: Maximum distance in kilometers (default: 0.2)

    Returns:
        PlaceOfInterest object or None if no place within threshold
    """
    if places is None:
        places = PlaceOfInterest.query.all()

    best_place = None
    best_distance = None

    for place in places:
        distance = calculate_distance(
            latitude, longitude,
            place.latitude, place.longitude
        )
        if best_place is None or distance < best_distance:
            best_place = place
            best_distance = distance

    if best_place and best_distance is not None and best_distance <= threshold_km:
        return best_place

    return None


def search_places(search_term='', area_filter=''):
    """
    Search places by name and/or area

    Args:
        search_term: Text to search in place name
        area_filter: Filter by area

    Returns:
        Query object (caller should apply pagination)
    """
    query = PlaceOfInterest.query

    if search_term:
        query = query.filter(PlaceOfInterest.name.ilike(f'%{search_term}%'))

    if area_filter:
        query = query.filter(PlaceOfInterest.area.ilike(f'%{area_filter}%'))

    return query.order_by(PlaceOfInterest.created_at.desc())


def create_place(name, latitude, longitude, address='', area='', contact='',
                 telephone='', category='General', description='', created_by=None):
    """
    Create a new place of interest

    Args:
        name: Place name (required)
        latitude: Place latitude (required)
        longitude: Place longitude (required)
        address: Street address (optional)
        area: Area/neighborhood (optional)
        contact: Contact person (optional)
        telephone: Phone number (optional)
        category: Category type (default: 'General')
        description: Place description (optional)
        created_by: User ID who created it (optional)

    Returns:
        PlaceOfInterest object
    """
    place = PlaceOfInterest(
        name=name.strip(),
        latitude=latitude,
        longitude=longitude,
        address=address.strip() if address else '',
        area=area.strip() if area else '',
        contact=contact.strip() if contact else '',
        telephone=telephone.strip() if telephone else '',
        category=category.strip() if category else 'General',
        description=description.strip() if description else '',
        created_by=created_by
    )

    try:
        db.session.add(place)
        db.session.commit()
        current_app.logger.info(f"Place created: {place.name}")
        return place
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating place: {str(e)}")
        raise


def update_place(place_id, name=None, address=None, area=None, contact=None,
                 telephone=None, category=None, description=None,
                 latitude=None, longitude=None):
    """
    Update place information

    Args:
        place_id: ID of the place to update
        name: New name (optional)
        address: New address (optional)
        area: New area (optional)
        contact: New contact (optional)
        telephone: New telephone (optional)
        category: New category (optional)
        description: New description (optional)
        latitude: New latitude (optional)
        longitude: New longitude (optional)

    Returns:
        Updated PlaceOfInterest object or None if not found
    """
    place = PlaceOfInterest.query.get(place_id)
    if not place:
        return None

    try:
        if name is not None and name:
            place.name = name.strip()
        if address is not None:
            place.address = address.strip() if address else ''
        if area is not None:
            place.area = area.strip() if area else ''
        if contact is not None:
            place.contact = contact.strip() if contact else ''
        if telephone is not None:
            place.telephone = telephone.strip() if telephone else ''
        if category is not None:
            place.category = category.strip() if category else 'General'
        if description is not None:
            place.description = description.strip() if description else ''
        if latitude is not None:
            place.latitude = float(latitude)
        if longitude is not None:
            place.longitude = float(longitude)

        db.session.commit()
        current_app.logger.info(f"Place updated: {place.name}")
        return place
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating place: {str(e)}")
        raise


def delete_place(place_id):
    """
    Delete a place of interest

    Args:
        place_id: ID of the place to delete

    Returns:
        Place name if successful, None if not found
    """
    place = PlaceOfInterest.query.get(place_id)
    if not place:
        return None

    try:
        place_name = place.name
        db.session.delete(place)
        db.session.commit()
        current_app.logger.info(f"Place deleted: {place_name}")
        return place_name
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting place: {str(e)}")
        raise


def get_visit_analytics(visits, places=None, threshold_km=0.2):
    """
    Generate visit analytics matching saved locations to places of interest

    Args:
        visits: List of SavedLocation objects
        places: List of PlaceOfInterest objects (if None, queries all)
        threshold_km: Distance threshold for matching (default: 0.2)

    Returns:
        List of analytics dictionaries with visit counts by place
    """
    if places is None:
        places = PlaceOfInterest.query.all()

    report = {}

    for visit in visits:
        place = find_place_for_coordinate(
            visit.latitude, visit.longitude,
            places=places,
            threshold_km=threshold_km
        )

        if not place:
            continue

        if place.id not in report:
            report[place.id] = {
                'place_id': place.id,
                'name': place.name,
                'address': place.address,
                'area': place.area,
                'contact': place.contact,
                'telephone': place.telephone,
                'latitude': place.latitude,
                'longitude': place.longitude,
                'visits': 0,
                'vehicles': {},
                'last_visited': None
            }

        rec = report[place.id]
        rec['visits'] += 1
        rec['last_visited'] = max(rec['last_visited'], visit.timestamp.isoformat()) \
            if rec['last_visited'] else visit.timestamp.isoformat()

        # Track vehicles that visited
        vehicle = Vehicle.query.get(visit.vehicle_id)
        if vehicle:
            if vehicle.id not in rec['vehicles']:
                rec['vehicles'][vehicle.id] = {'id': vehicle.id, 'name': vehicle.name, 'count': 0}
            rec['vehicles'][vehicle.id]['count'] += 1

    # Build result list with vehicle counts
    results = []
    for place_id, data in report.items():
        vehicles_list = list(data['vehicles'].values())
        results.append({
            'place_id': data['place_id'],
            'name': data['name'],
            'address': data['address'],
            'area': data['area'],
            'contact': data['contact'],
            'telephone': data['telephone'],
            'latitude': data['latitude'],
            'longitude': data['longitude'],
            'visits': data['visits'],
            'vehicles': vehicles_list,
            'last_visited': data['last_visited']
        })

    # Sort by visit count (descending)
    results.sort(key=lambda x: x['visits'], reverse=True)

    return results
