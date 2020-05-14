"""
Insta485 index (main) view.
URLs include:
/
Andrew DeOrio <awdeorio@umich.edu>
"""
import flask
import dash


@dash.app.route('/', methods=["GET", "POST"])
def show_index():
    """Display / route."""

    # # User
    # logname = flask.session["logname"]
    # context = {"logname": logname}
    context = {}
    return flask.render_template("index.html", **context)