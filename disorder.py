#!/usr/bin/python
# apt-get install python-flask-sqlalchemy python-flask-restful
from flask import Flask, request, send_from_directory
from flask_restful import Resource, Api
import sqlalchemy
from json import dumps
import datetime
# from flask.ext.jsonpify import jsonify

engine = sqlalchemy.create_engine('sqlite:///disorder.db')
app = Flask(__name__, static_url_path='')
api = Api(app)

class Employees(Resource):
    def get(self):
        conn = engine.connect()
        query = conn.execute("select * from employees")
        return [{'id':i[0], 'value': i[0], 'content': i[1], 'className': 'group-'+str(i[0])} for i in query.cursor.fetchall()]


class Tasks(Resource):
    def get(self):
        conn = engine.connect()
        query = conn.execute("select * from tasks")
        return [{'id':i[0], 'group': i[1], 'content': i[2], 'start': i[3], 'end': i[4]} for i in query.cursor.fetchall()]

    def post(self):
        title = request.form['title']
        group = request.form['group']
        start = datetime.datetime.fromtimestamp(float(request.form['start']))
        end = datetime.datetime.fromtimestamp(float(request.form['end']))
        unscheduled_id = None
        if request.form.has_key('unscheduled_id'):
            unscheduled_id = int(request.form['unscheduled_id'])

        conn = engine.connect()
        metadata = sqlalchemy.MetaData(engine)
        metadata.reflect()
        tables = metadata.tables
        if unscheduled_id:
            query = tables['unscheduled_tasks'].delete().where(tables['unscheduled_tasks'].c.id == unscheduled_id).execute()
        query = sqlalchemy.insert(tables['tasks']).values(group=int(group), title=title, start=start, end=end).execute()
        return {'id': query.lastrowid}

    def put(self):
        task_id = int(request.form['id'])
        title = request.form['title']
        group = int(request.form['group'])
        start = datetime.datetime.fromtimestamp(float(request.form['start']))
        end = datetime.datetime.fromtimestamp(float(request.form['end']))

        conn = engine.connect()
        metadata = sqlalchemy.MetaData(engine)
        metadata.reflect()
        tables = metadata.tables
        tables['tasks'].update().where(tables['tasks'].c.id == task_id).values(
            group=int(group), title=title, start=start, end=end
            ).execute()
        return {'id': task_id}

    def delete(self):
        del_id = int(request.form['id'])
        conn = engine.connect()
        metadata = sqlalchemy.MetaData(engine)
        metadata.reflect()
        tables = metadata.tables
        title = tables['tasks'].select().where(tables['tasks'].c.id == del_id).execute().fetchall()[0][2]
        query = sqlalchemy.insert(tables['unscheduled_tasks']).values(title=title).execute()
        tables['tasks'].delete().where(tables['tasks'].c.id == del_id).execute()
        return {'id': query.lastrowid}

class UnscheduledTasks(Resource):
    def get(self):
        conn = engine.connect()
        query = conn.execute("select * from unscheduled_tasks")
        return [{'id':i[0], 'title': i[1]} for i in query.cursor.fetchall()]

    def delete(self):
        del_id = int(request.form['id'])
        conn = engine.connect()
        metadata = sqlalchemy.MetaData(engine)
        metadata.reflect()
        tables = metadata.tables
        tables['unscheduled_tasks'].delete().where(tables['unscheduled_tasks'].c.id == del_id).execute()
        return {'id': del_id}

        
@app.route('/')
def root():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

api.add_resource(Employees, '/employees')
api.add_resource(Tasks, '/tasks')
api.add_resource(UnscheduledTasks, '/unscheduled_tasks')


if __name__ == '__main__':
     app.run(port=8080, debug=True)
     