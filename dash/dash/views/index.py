"""
Instructor dashboard catch all view.
Routing is done on the client side.

Christina Fosheim-Hoag <cmfh@umich.edu> and Noa Levi <nlevi@umich.edu>
"""
import flask
import dash


@dash.app.route('/', defaults={'path': ''})
@dash.app.route('/<path:path>')
def show_index(path):
    """Catch all route returns index.html."""

    # User
    # logname = flask.session["logname"]
    # context = {"logname": logname}
    context = {}
    return flask.render_template("index.html", **context)