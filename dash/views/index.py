"""
Insta485 index (main) view.
URLs include:
/
Andrew DeOrio <awdeorio@umich.edu>
"""
import flask
import dash


@dash.app.route('/dashboard', methods=["GET", "POST"])
def show_exercises_list():
    """Display / route."""

    # User
    logname = flask.session["logname"]
    context = {"logname": logname}
    return flask.render_template("index.html", **context)


@dash.app.route('/dashboard/<class_id>/<exercise_id>', methods=["GET", "POST"])
def show_exercise_overview(class_id, exercise_id):
    """Display / route."""

    # User
    logname = flask.session["logname"]
    context = {"logname": logname}
    return flask.render_template("index.html", **context)