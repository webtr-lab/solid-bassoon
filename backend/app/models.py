from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    role = db.Column(db.String(20), default='viewer')
    must_change_password = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Vehicle(db.Model):
    __tablename__ = 'vehicles'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    device_id = db.Column(db.String(100), unique=True, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    locations = db.relationship('Location', backref='vehicle', lazy=True, cascade='all, delete-orphan')
    saved_locations = db.relationship('SavedLocation', backref='vehicle', lazy=True, cascade='all, delete-orphan')

class Location(db.Model):
    __tablename__ = 'locations'
    
    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    speed = db.Column(db.Float, default=0.0)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
class SavedLocation(db.Model):
    __tablename__ = 'saved_locations'
    
    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicles.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    stop_duration_minutes = db.Column(db.Integer, default=0)
    visit_type = db.Column(db.String(50))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)

class PlaceOfInterest(db.Model):
    __tablename__ = 'places_of_interest'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    address = db.Column(db.String(500))
    area = db.Column(db.String(100))
    contact = db.Column(db.String(200))
    telephone = db.Column(db.String(50))
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(100))
    description = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    creator = db.relationship('User', backref=db.backref('created_places', lazy=True))
