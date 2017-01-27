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
        this.refreshContent();
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
    },

    refreshContent : function() {
        if (this.i_activeQueue) {
            document.title = this.i_activeQueue.course().shortName() + " OH (" + this.i_activeQueue.numEntries() + ")";
            $(".course-content-numStudents").html(this.i_activeQueue.numEntries());
            $(".course-content-lastRefresh").html(this.i_activeQueue.lastRefresh().toLocaleTimeString());
        }
    },

    notify : function(title, message){
      if (!Notification) {
        alert(message);
      }
      else {
        if (Notification.permission !== "granted") {
          Notification.requestPermission();
        }
        else {
          new Notification(title, {
            body: message
          });
        }
      }
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

    shortName : function() {
        return this.i_shortName;
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
            var queue = Queue.instance(item, self, queueElem);
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

    init : function(data, course, elem) {

        this.i_course = course;

        this.i_queueId = data["queueId"];
        this.i_location = data["location"];
        this.i_name = data["name"];
        this.i_elem = elem;

        this.i_isAdmin = false;
        this.i_numEntries = 0;
        this.i_currentRefreshIndex = 0;
        this.i_lastRefresh = new Date();
        this.i_isOpen = false;
        this.i_refreshDisabled = false;

        var statusElem = $('<p></p>');
        statusElem.append('<span data-toggle="tooltip" title="Number of Students"><span class="glyphicon glyphicon-education"></span> <span class="course-content-numStudents"></span></span>');
        statusElem.append('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');
        statusElem.append('<span data-toggle="tooltip" title="Last Refresh"><span class="glyphicon glyphicon-refresh"></span> <span class="course-content-lastRefresh"></span></span>');
        statusElem.append('<br />');
        this.i_elem.append(statusElem);

        this.i_statusMessageElem = $('<p>Loading queue information...</p>');
        this.i_elem.append(this.i_statusMessageElem);

        this.i_controlsElem = $('<div class="panel panel-default"><div class="panel-body"></div></div>')
            .appendTo(this.i_elem)
            .find(".panel-body");


        this.i_elem.find('[data-toggle="tooltip"]').tooltip();

        this.i_signUpButton = $('<button type="button" class="openSignUpDialogButton btn btn-success" data-toggle="modal" data-target="#signUpDialog">Sign Up</button>');
        this.makeActiveOnClick(this.i_signUpButton);
        this.i_controlsElem.append(this.i_signUpButton);

        this.i_controlsElem.append(" ");
        var clearQueueButton = $('<button type="button" class="btn btn-danger adminOnly" data-toggle="modal" data-target="#clearTheQueueDialog">Clear the queue</button>');
        this.makeActiveOnClick(clearQueueButton); // TODO I don't think this is necessary anymore. If they can click it, it should be active.
        this.i_controlsElem.append(clearQueueButton);

        this.i_controlsElem.append(" ");
        var openScheduleDialogButton = $('<button type="button" class="btn btn-info adminOnly" data-toggle="modal" data-target="#scheduleDialog">Schedule</button>');
        this.makeActiveOnClick(openScheduleDialogButton); // TODO I don't think this is necessary anymore. If they can click it, it should be active.
        this.i_controlsElem.append(openScheduleDialogButton);

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

        // myRefreshIndex is captured in a closure with the callback.
        // if refresh had been called again, the index won't match and
        // we don't do anything. this prevents the situation where someone
        // signs up but then a pending request from before they did so finishes
        // and causes it to look like they were immediately removed. this also
        // fixes a similar problem when an admin removes someone but then a
        // pending refresh makes them pop back up temporarily.
        this.i_currentRefreshIndex += 1;
        var myRefreshIndex = this.i_currentRefreshIndex;

        return this.ajax({
            type: "POST",
            url: "queue-api/list",
            data: {
                idtoken: User.idToken(),
                queueId: this.i_queueId
            },
            dataType: "json",
            success: function(data){
                // if another refresh has been requested, ignore the results of this one
                if (myRefreshIndex === this.i_currentRefreshIndex){
                    this.refreshResponse(data);
                }
            },
            error: oops
        });
    },

    refreshResponse : function(data){
        
        if (this.i_refreshDisabled) {
          return;
        }

        if (data["message"]) {
            QueueApplication.message(data["message"]);
        }

        var isOpen = data["isOpen"];
        this.i_isOpen = isOpen;
        if (isOpen) {
            this.i_statusMessageElem.html("The queue is open.");
        }
        else {
            var schedule = data["schedule"];
            var halfHour = data["halfHour"];
            var nextOpen = -1;
            for(var i = halfHour; i < 48; ++i) {
                var scheduleType = schedule.charAt(i);
                if (scheduleType === "o" || scheduleType === "p") {
                    nextOpen = i;
                    break;
                }
            }

            if (nextOpen === -1) {
                this.i_statusMessageElem.html("The queue is closed for today.");
            }
            else {
                var d = new Date();
                d.setHours(0);
                d.setMinutes(0);
                d.setSeconds(0);

                var newDate = new Date(d.getTime() + nextOpen*30*60000);
                this.i_statusMessageElem.html("The queue is closed right now. It will open at " + newDate.toLocaleTimeString() + ".");
            }


        }
        this.refreshSignInButtonEnabled();


        var queue = data["queue"];
        this.i_queueElem.empty();
        var queueEntries = [];
        for(var i = 0; i < queue.length; ++i) {
            var item = queue[i];

            var itemElem = $("<li class='list-group-item'></li>");
            queueEntries.push(QueueEntry.instance(this, item, itemElem));

            this.i_queueElem.append(itemElem);

        }

        console.log(JSON.stringify(data["stack"], null, 4));


        var oldNumEntries = this.i_numEntries;
        this.i_numEntries = queue.length;
        if(this.i_isAdmin && oldNumEntries === 0 && this.i_numEntries > 0) {
          QueueApplication.notify("Request Received!", queueEntries[0].name());
        }


        this.i_lastRefresh = new Date();
    },

    numEntries : function() {
        return this.i_numEntries;
    },

    lastRefresh : function() {
        return this.i_lastRefresh;
    },

    cancelIncomingRefresh : function () {
      this.i_currentRefreshIndex += 1;
    },
    
    disableRefresh : function() {
      this.i_refreshDisabled = true;
    },
    
    enableRefresh : function() {
      this.i_refreshDisabled = false;
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
            dataType: "json",
            success: function(data){
                if (data["fail"]) {
                    showErrorMessage(data["reason"]);
                }
                else {
                    this.refresh();
                }
            },
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
        this.refreshSignInButtonEnabled();
    },

    refreshSignInButtonEnabled : function() {
        this.i_signUpButton.prop("disabled", !User.isUmich() || !this.i_isOpen);
    },

    course : function() {
        return this.i_course;
    },

    queueId : function() {
        return this.i_queueId;
    }


});

var QueueEntry = Class.extend({
    _name : "QueueEntry",

    init : function(queue, data, elem) {
        this.i_queue = queue;
        this.i_elem = elem;

        this.i_id = data["id"];
        this.i_email = data["email"];

        this.i_isMe = !!data["name"]; // if it has a name it's them

        var name = this.i_name = data["name"] ? data["name"] + " (" + data["email"] + ")" : "Anonymous Student";
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

        var removeButton = $('<button type="button" class="btn btn-danger">Remove</button>');
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
                error: oops
            });

            // This will prevent a currently incoming
            // refresh from messing up the animation and making it look like
            // the item you just removed has come back.
            self.i_queue.disableRefresh();

            self.i_elem.slideUp(500, function(){
                $(this).remove();
                self.i_queue.enableRefresh(); // turn refresh back on
                self.i_queue.refresh(); // request a refresh
            });

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
    },
    name : function() {
      return this.i_name;
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

        this.ajax({
            type: "POST",
            url: "queue-api/login",
            data: {
                idtoken: this.i_idToken
            },
            success: function (data) {
              this.i_checkAdmin();
            },
            error: oops
        });

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

		// TODO HACK If admin for anything, give them fast refresh
                // should only be on the queues they administer
                // also if admin prompt for notifications
		if (data.length > 0) {
                  setInterval(function() {
                    QueueApplication.refreshActiveQueue();
                  }, 5000);

                  if (Notification) {
                    Notification.requestPermission();
                  }
                }
                else {
                  setInterval(function() {
                    QueueApplication.refreshActiveQueue();
                  }, 60000);
                }

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
        setInterval(function() {
          QueueApplication.refreshActiveQueue();
        }, 60000);

    },

    isUmich : function() {
        return false;
    },

    idToken : function() {
        return "";
    }
});

var User = UserBase.singleton();

var Schedule = Singleton(Class.extend({
    _name: "Schedule",

    i_sequence : {
        "o": "c",
        "c": "p",
        "p": "o"
    },

    init : function(elem) {
        var dialog = $("#scheduleDialog");

        var self = this;
        $("#scheduleForm").submit(function(e){
            e.preventDefault();

            self.update();

            dialog.modal("hide");
            return false;
        });

        dialog.on('shown.bs.modal', function () {
            self.refresh();
        });

        // Set up table in schedule picker
        var schedulePicker = $("#schedulePicker");

        // First row of table with time headers
        var firstRow = $("<tr></tr>").appendTo(schedulePicker);

        // Extra blank in first row to correspond to row labels in other rows
        firstRow.append('<td style="width:1em; padding-right: 3px;"></td>');

        for(var i = 0; i < 24; ++i) {
            firstRow.append('<td colspan="2">' + (i === 0 || i === 12 ? 12 : i % 12) + '</td>');
        }

        this.i_unitElems = [];
        var dayLetters = ["S","M","T","W","T","F","S"];
        for(var r = 0; r < 7; ++r) {
            var day = [];
            var rowElem = $('<tr></tr>');
            rowElem.append('<td style="width:1em; text-align: right; padding-right: 3px;">' + dayLetters[r] + '</td>');
            for(var c = 0; c < 48; ++c) {
                var unitElem = $('<td><div class="scheduleUnit"></div></td>').appendTo(rowElem).find(".scheduleUnit");
                day.push(unitElem);
            }
            this.i_unitElems.push(day);
            schedulePicker.append(rowElem);
        }

        var pressed = false;
        schedulePicker.on("mousedown", function(e){
            e.preventDefault();
            pressed = true;
            return false;
        });
        schedulePicker.on("mouseup", function(){
            pressed = false;
        });
        schedulePicker.on("mouseleave", function(){
            pressed = false;
        });
        dialog.on('hidden.bs.modal', function () {
            pressed = false;
        });

        var changeColor = function(elem) {
            if (pressed){
                var currentType = elem.data("scheduleType");
                elem.removeClass("scheduleUnit-" + currentType);

                var nextType = self.i_sequence[currentType];
                elem.data("scheduleType", nextType);
                elem.addClass("scheduleUnit-" + nextType);
            }
        };
        schedulePicker.on("mouseover", ".scheduleUnit", function(e){
            e.preventDefault();
            changeColor($(this));
            return false;
        });
        schedulePicker.on("mousedown", ".scheduleUnit", function(e){
            e.preventDefault();
            pressed = true;
            console.log("hi");
            changeColor($(this));
            return false;
        });
    },

    refresh : function() {
        if (!QueueApplication.activeQueue()) { return; }

        return this.ajax({
            type: "GET",
            url: "queue-api/schedule/" + QueueApplication.activeQueue().queueId(),
            dataType: "json",
            success: function(data) {
                var schedule = data; // array of 7 strings
                for(var r = 0; r < 7; ++r) {
                    for(var c = 0; c < 48; ++c) {
                        var elem = this.i_unitElems[r][c];
                        elem.removeClass(); // removes all classes
                        elem.addClass("scheduleUnit");
                        elem.addClass("scheduleUnit-" + schedule[r].charAt(c));
                        elem.data("scheduleType", schedule[r].charAt(c));
                    }
                }
            },
            error: oops
        });
    },

    update : function() {
        if (!QueueApplication.activeQueue()) { return; }

        // lol can't make up my mind whether I like functional vs. iterative
        var schedule = [];
        for(var r = 0; r < 7; ++r) {
            schedule.push(this.i_unitElems[r].map(function(unitElem){
                return unitElem.data("scheduleType");
            }).join(""));
        }

        return this.ajax({
            type: "POST",
            url: "queue-api/updateSchedule",
            data: {
                idtoken: User.idToken(),
                queueId: QueueApplication.activeQueue().queueId(),
                schedule: schedule
            },
            success: function() {
                console.log("schedule updated");
            },
            error: oops
        });
    }


}));

// Give warning to users in Safari/iOS private browsing
// mode that Google sign-in won't work.
// TODO: I'm not convinced this actually does anything
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
    $("#oopsDialog").modal("show");
}

function showErrorMessage(message) {
    console.log(message);
    $("#errorMessage").html(message);
    $("#errorDialog").modal("show");
}
