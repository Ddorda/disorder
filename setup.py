#!/usr/bin/python


import sqlalchemy as db
import datetime


def date(date_str):
    return datetime.datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')

engine = db.create_engine('sqlite:///disorder.db')

conn = engine.connect()
metadata = db.MetaData(engine)
metadata.reflect()

employees = db.Table('employees', metadata,
              db.Column('id', db.Integer(), primary_key=True),
              db.Column('name', db.String(255), nullable=False)
              )

tasks = db.Table('tasks', metadata,
              db.Column('id', db.Integer(), primary_key=True),
              db.Column('group', db.Integer()),
              db.Column('title', db.String(1024), nullable=False),
              db.Column('start', db.DateTime(), nullable=False),
              db.Column('end', db.DateTime(), nullable=False)
              )

unscheduled_tasks = db.Table('unscheduled_tasks', metadata,
              db.Column('id', db.Integer(), primary_key=True),
              db.Column('title', db.String(1024), nullable=False)
              )

metadata.create_all(engine) #Creates the table

# metadata.reflect(conn)
tables = metadata.tables

# Employees
query = db.insert(tables['employees']).values(name='Dev').execute()
query = db.insert(tables['employees']).values(name='Employee1').execute()
query = db.insert(tables['employees']).values(name='Employee2').execute()
query = db.insert(tables['employees']).values(name='Employee3').execute()
