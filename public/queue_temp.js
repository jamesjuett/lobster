/**
 * Created by James Juett on 9/5/2016.
 */

var QueueApplication = Singleton(Class.extend({
    _name: "QueueApplication",

    init : function(elem) {
        this.i_elem = elem;

        this.i_coursePills = elem.find(".coursePills");
        this.i_coursePanes = elem.find(".coursePanes");

        this.i_courses = [];

        this.i_messagesShown = {};

        this.loadCourses();
    },

    loadCourses : function() {
        return this.ajax({
            type: "GET",
            url: "/queue-api/courseList",
            dataType: "json",
            success: this.onCoursesLoad,
            error: oops
        });
    },

    onCoursesLoad : function(list){
        this.i_coursePills.empty();
        this.i_coursePanes.empty();
        this.i_courses.clear();


        // No active course initially
        this.i_coursePanes.append($('<div class="tab-pane fade in active"><h1><span class="glyphicon glyphicon-arrow-left"></span> Please select a course.</h1></div>'));

        var self = this;
        list.forEach(function(courseData){

            // Escape everything
            // TODO redundant - this happens on the server
            for (var key in courseData){
                courseData[key] = escapeHtml(courseData[key]);
            }

            var courseId = courseData["courseId"];

            // Add the pill used to select the course
            var pillElem = $('<li><a href="#' + courseId + '" data-toggle="pill"><h3>' + courseId + '</h3></a></li>');
            self.i_coursePills.append(pillElem);

            // Add the element that will contain the course content
            var courseElem = $('<div id="' + courseId + '" class="tab-pane fade"></div>');
            self.i_coursePanes.append(courseElem);

            // Create the course itself
            var course = Course.instance(courseData, courseElem);
            self.i_courses.push(course);

            pillElem.find("a").click(function(){
                course.makeActive();
            });
        });
    },

    setActiveQueue : function(queue) {
        this.i_activeQueue = queue;
        console.log("Setting active queue to " + queue.i_queueId);
    },

    activeQueue : function(){
        return this.i_activeQueue;
    },

    userSignedIn : function() {
        this.i_courses.forEach(function(course){
            course.userSignedIn();
        });
    },

    refreshActiveQueue : function() {
        this.i_activeQueue && this.i_activeQueue.refresh();
    },

    message : function(message) {
        if (!this.i_messagesShown[message.id]){
            this.i_messagesShown[message.id] = true;
            $("#messageDialogHeader").html('Message');
            $("#messageDialogContent").append('<p><span class="label label-info">'  + message["sender"] + '</span> ' + message["message"] + '</p>');
            $("#messageDialog").modal("show");
        }
    },

    setSendMessagePostId : function(id) {
        this.i_sendMessagePostId = id;
    },

    sendMessage : function(message) {
        this.ajax({
            type: "POST",
            url: "queue-api/sendMessage",
            data: {
                idtoken: User.idToken(),
                id: this.i_sendMessagePostId,
                message: message
            },
            success: function(){
            },
            error: oops
        });
    }
}));


var Course = Class.extend({
    _name: "Course",

    init : function(data, elem) {

        this.i_courseId = data["courseId"];
        this.i_shortName = data["shortName"];
        this.i_fullName = data["fullName"];
        this.i_elem = elem;
        this.i_isAdmin = false;

        this.i_queues = [];

        this.i_elem.addClass(User.isCourseAdmin(this.i_courseId));

        this.i_queuePillsElem = $('<ul class="queuePills nav nav-pills"></ul>');
        this.i_elem.append(this.i_queuePillsElem);

        this.i_pickAQueueElem = $('<div></div>');
        this.i_pickAQueueElem.append($('<h3><span class="glyphicon glyphicon-arrow-up"></span> Several locations are available for ' + this.i_shortName + '. Please select one.</h3>'));
        this.i_elem.append(this.i_pickAQueueElem);

        this.i_mainElem = $('<div></div>');
        this.i_mainElem.hide();

        this.i_queuePanesElem = $('<div class="col-xs-9 col-md-5 queuePanes tab-content"></div>');
        this.i_mainElem.append(this.i_queuePanesElem);

        this.i_contentElem = $('<div class="col-xs-9 col-md-5"></div>');
        this.i_mainElem.append(this.i_contentElem);

        this.i_elem.append(this.i_mainElem);

        this.loadContent();
        this.loadQueues();
    },

    makeActive : function() {
        // Don't need to do anything in particular for the course itself,
        // but we do need to make sure the active queue within this course
        // is the active queue overall since it will be shown.
        this.i_activeQueue && this.i_activeQueue.makeActive();
    },

    loadContent : function() {
        this.i_contentElem.load("queue-component/courseContent/" + this.i_courseId);
    },

    loadQueues : function() {
        return this.ajax({
            type: "GET",
            url: "queue-api/queueList/" + this.i_courseId,
            dataType: "json",
            success: this.i_onQueuesLoad,
            error: oops
        });
    },

    i_onQueuesLoad : function(list){
        this.i_queues.clear();
        this.i_queuePillsElem.empty();
        this.i_queuePanesElem.empty();

        var self = this;
        list.forEach(function(item){
            var name = item["name"];
            var queueId = item["queueId"];

            // Add pills for each queue belonging to this course
            var pillElem = $('<li><a data-toggle="pill"><h6>' + name + '</h6></a></li>');
            pillElem.find("a").prop("href", "#queue" + queueId);
            self.i_queuePillsElem.append(pillElem);

            // Add panes to hold the queue
            var queueElem = $('<div id="queue' + queueId + '"></div>');
            queueElem.addClass("tab-pane fade");
            self.i_queuePanesElem.append(queueElem);

            // Create the queue objects themselves
            var queue = Queue.instance(item, queueElem);
            self.i_queues.push(queue);

            queue.refresh();

            pillElem.find("a").click(function(){
                self.i_pickAQueueElem.empty();
                self.i_activeQueue = queue;
                self.i_mainElem.show();
                queue.makeActive();
            });
        });


        // If only one queue, select it automatically
        // (pillElem and queueElem are still in scope even after the loop body)
        if (this.i_queues.length === 1) {
            this.i_queuePillsElem.children().first().addClass("active");
            this.i_queuePanesElem.children().first().addClass("in active");
            this.i_activeQueue = this.i_queues[0];
            this.i_pickAQueueElem.hide();
            this.i_mainElem.show();
        }
        else{
            this.i_pickAQueueElem.show();
            this.i_mainElem.hide();
        }

        this.setAdmin(User.isCourseAdmin(this.i_courseId));
    },

    // updateList : function(list){
    //     this.i_elem.empty();
    //     for(var i = 0; i < list.length; ++i) {
    //         var item = list[i];
    //
    //         var itemElem = $("<li class='list-group-item'></li>");
    //         QueueEntry.instance(item, itemElem);
    //
    //         this.i_elem.append(itemElem);
    //
    //     }
    // },

    setAdmin : function(isAdmin){
        this.i_isAdmin = isAdmin;
        for(var i = 0; i < this.i_queues.length; ++i) {
            this.i_queues[i].setAdmin(isAdmin)
        }
        if (this.i_isAdmin) {
            this.i_elem.addClass("admin");
            this.i_elem.removeClass("notAdmin");
        }
        else{
            this.i_elem.addClass("notAdmin");
            this.i_elem.removeClass("admin");
        }
    },

    userSignedIn : function(){
        this.setAdmin(User.isCourseAdmin(this.i_courseId));
        this.i_queues.forEach(function(queue){
            queue.userSignedIn();
        });
    }

});


var Queue = Class.extend({
    _name: "Queue",

    init : function(data, elem) {

        this.i_queueId = data["queueId"];
        this.i_location = data["location"];
        this.i_name = data["name"];
        this.i_elem = elem;

        this.i_isAdmin = false;

        this.i_controlsElem = $('<div class="panel panel-default"><div class="panel-body"></div></div>')
            .appendTo(this.i_elem)
            .find(".panel-body");


        this.i_signUpButton = $('<button type="button" class="openSignUpDialogButton btn btn-success" data-toggle="modal" data-target="#signUpDialog">Sign Up</button>');
        this.makeActiveOnClick(this.i_signUpButton);
        this.i_controlsElem.append(this.i_signUpButton);

        this.i_controlsElem.append(" ");
        var clearQueueButton = $('<button type="button" class="btn btn-danger adminOnly" data-toggle="modal" data-target="#clearTheQueueDialog">Clear the queue</button>');
        this.makeActiveOnClick(clearQueueButton);
        this.i_controlsElem.append(clearQueueButton);

        this.i_queueElem = $('<div></div>').appendTo(this.i_elem);

        this.userSignedIn(); // TODO change name to updateUser?
    },

    makeActiveOnClick : function(elem) {
        var self = this;
        elem.click(function(){
            self.makeActive();
        });
    },

    makeActive : function() {
        QueueApplication.setActiveQueue(this);
        this.refresh();
    },

    refresh : function() {
        return this.ajax({
            type: "POST",
            url: "queue-api/list",
            data: {
                idtoken: User.idToken(),
                queueId: this.i_queueId
            },
            dataType: "json",
            success: this.updateList,
            error: oops
        });
    },

    updateList : function(data){
        var list = data.list;
        if (data.message) {
            QueueApplication.message(data.message);
        }
        this.i_queueElem.empty();
        for(var i = 0; i < list.length; ++i) {
            var item = list[i];

            var itemElem = $("<li class='list-group-item'></li>");
            QueueEntry.instance(item, itemElem);

            this.i_queueElem.append(itemElem);

        }
    },

    clear : function() {
        return this.ajax({
            type: "POST",
            url: "queue-api/clear",
            data: {
                idtoken: User.idToken(),
                queueId: this.i_queueId
            },
            success: this.clearList,
            error: oops
        });
    },

    clearList : function() {
        this.i_queueElem.children().slideUp();
    },

    signUp : function(name, location, description) {
        return this.ajax({
            type: "POST",
            url: "queue-api/signUp",
            data: {
                idtoken: User.idToken(),
                queueId: this.i_queueId,
                name: name,
                location: location,
                description: description
            },
            success: this.refresh,
            error: oops
        });
    },

    setAdmin : function(isAdmin) {
        var oldAdmin = this.i_isAdmin;
        this.i_isAdmin = isAdmin;

        // If our privileges change, hit the server for appropriate data,
        // because it gives out different things for normal vs. admin
        if (oldAdmin != this.i_isAdmin) {
            this.refresh();
        }
    },

    userSignedIn : function() {
        this.i_signUpButton.prop("disabled", !User.isUmich());
    }


});

var QueueEntry = Class.extend({
    _name : "QueueEntry",

    init : function(data, elem) {
        this.i_elem = elem;

        this.i_id = data["id"];
        this.i_email = data["email"];

        this.i_isMe = !!data["name"]; // if it has a name it's them

        var name = data["name"] ? data["name"] + " (" + data["email"] + ")" : "Anonymous Student";
        this.i_nameElem = $('<p><span class="glyphicon glyphicon-education"></span></p>')
            .append(" " + name)
            .appendTo(this.i_elem);

        if (data["location"] && data["location"].length > 0){
            this.i_locationElem = $('<p><span class="glyphicon glyphicon-map-marker"></span></p>')
                .append(" " + data["location"])
                .appendTo(this.i_elem);
        }

        if (data["description"] && data["description"].length > 0){
            this.i_descriptionElem = $('<p><span class="glyphicon glyphicon-question-sign"></span></p>')
                .append(" " + data["description"])
                .appendTo(this.i_elem);
        }

        var timeWaiting = Date.now() - new Date(parseInt(data["ts"])*1000);
        var minutesWaiting = Math.round(timeWaiting / 1000 / 60);
        this.i_tsElem = $('<p><span class="glyphicon glyphicon-time"></span></p>')
            .append(" " + minutesWaiting + " min")
            .appendTo(this.i_elem);

        var removeButton = $('<button type="button" class="btn btn-danger adminOnly">Remove</button>');
        if (!this.i_isMe){
            removeButton.addClass("adminOnly");
        }
        var self = this;
        removeButton.on("click", function(e){
            console.log("removing " + self.i_email);
            $.ajax({
                type: "POST",
                url: "queue-api/remove",
                data: {
                    idtoken: User.idToken(),
                    id: self.i_id
                },
                success: function(data){
                    self.i_elem.slideUp(300, function(){
                        $(this).remove();
                    });
                },
                error: oops
            })
        });
        this.i_elem.append(removeButton);

        this.i_elem.append(" ");

        var sendMessageButton = $('<button type="button" class="btn btn-warning adminOnly">Message</button>');
        var self = this;
        sendMessageButton.on("click", function(){
            var sendMessageDialog = $("#sendMessageDialog");
            sendMessageDialog.modal("show");
            QueueApplication.setSendMessagePostId(self.i_id);
        });
        this.i_elem.append(sendMessageButton);
    }
});

// Target is set below subclasses
var UserBase = Class.extend({
    _name: "User",

    signIn : function(email, idtoken) {
        var newUser = AuthenticatedUser.instance(email, idtoken);
        User.setTarget(newUser);

        var accountMessageElem = $("#accountMessage");
        // If they're not umich, they can't sign up!
        if (!newUser.isUmich()){
            accountMessageElem.show();
            accountMessageElem.html("Hi " + newUser.i_email + "! Please <a>sign out</a> and switch to an @umich.edu account to use the queue.");
            var self = this;
            accountMessageElem.find("a").click(function(){
                var auth2 = gapi.auth2.getAuthInstance();
                auth2.disconnect().then(function () {
                    User.signOut();
                    accountMessageElem.hide();
                });
            });

            $(".openSignUpDialogButton").prop("disabled", true);
        }


        return this.s_instance;
    },
    signOut : function() {
        var accountMessageElem = $("#accountMessage");
        if (this.s_instance) {
            // If we have a user, need to notify any courses for which they were admin
            for(var i = 0; i < this.i_admins.length; ++i) {
                this.i_admins[i].setAdmin(false);
            }
            // TODO Move to subclass hook
        }

        accountMessageElem.hide();

        User.setTarget(UnauthenticatedUser.instance());
    },

    isUmich : Class._ABSTRACT,
    idToken : Class._ABSTRACT,
    isCourseAdmin : function() {
        return false;
    },

    onFinishSigningIn : function() {
        // Notify the application there's a new user in town
        QueueApplication.userSignedIn();
    }

});

var AuthenticatedUser = UserBase.extend({

    init : function(email, idtoken) {
        this.i_email = email;
        this.i_idToken = idtoken;
        this.i_admins = {};

        this.i_checkAdmin();
    },

    isUmich : function() {
        return this.i_email.endsWith("@umich.edu");
    },

    idToken : function() {
        return this.i_idToken;
    },

    i_checkAdmin : function() {
        return this.ajax({
            type: "POST",
            url: "queue-api/adminCourses",
            data: {
                idtoken: this.i_idToken
            },
            dataType: "json",
            success: function (data) {
                this.i_admins = {};
                // TODO change to map js style wheeee
                for(var i = 0; i < data.length; ++i){
                    var courseId = data[i]["courseId"];
                    this.i_admins[courseId] = true;
                }
                // See if user is finished signing in
                this.onFinishSigningIn();
            },
            error: oops
        });
    },

    isCourseAdmin : function (courseId) {
        return this.i_admins[courseId];
    }

});


var UnauthenticatedUser = UserBase.extend({

    init : function() {
        this.onFinishSigningIn();
    },

    isUmich : function() {
        return false;
    },

    idToken : function() {
        return "";
    }
});

var User = UserBase.singleton();

// Give warning to users in Safari/iOS private browsing
// mode that Google sign-in won't work.
//https://gist.github.com/philfreo/68ea3cd980d72383c951
if (typeof sessionStorage === 'object') {
    try {
        sessionStorage.setItem('localStorage', 1);
        sessionStorage.removeItem('localStorage');
    } catch (e) {
        oops("It looks like local storage is disabled in your browser. This may aggravate an issue with Google sign-in on Safari or iOS while using private browsing mode.");
    }
}

function oops(xhr, textStatus){
    if (textStatus === "abort") { return; }
    console.log("Oops. An error occurred. Try refreshing the page.");
    $("#errorDialog").modal("show");
}