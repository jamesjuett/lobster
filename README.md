# lobster
Interactive Program Visualization Tools


### Install virtualbox ###

https://www.virtualbox.org/wiki/Downloads

### Install vagrant ###

https://www.vagrantup.com/downloads.html

### Clone the repo to your local machine. ###

Once you've done this, run vagrant up in the directory with the vagrantfile you cloned from the repo.

### Edit your hosts file ###

Edit your hosts file. Add an entry to map the VM's IP to "lobster-dev". The IP should always be the same as here.

192.168.33.10 lobster-dev

### Connect to the VM and run some setup there ###

Use ssh to connect to the VM at "lobster-dev". username and password are both "vagrant"

cd to /var/www/public

Run the following:

~~~ bash
$ composer update

$ composer install
~~~

### Done! ###

That's it! You can edit the source files in the lobster directory locally (you don't have to do it on the VM itself!).
Use whatever editor you like. I personally prefer JetBrains WebStorm for an IDE, which you should be able to get for
free as a student.

Access lobster at http://lobster-dev. (Again, you can use a browser from your local machine, not from the VM.)

To access the mysql database while ssh'ed into the VM, username and password are both "root"

If login randomly stops working, it might be that the system time on your virtual machine somehow got thrown off.
To fix this, ssh into the VM and follow the answer here: http://askubuntu.com/questions/254826/how-to-force-a-clock-update-using-ntp


Command to generate parser module:
```console
./node_modules/pegjs/bin/pegjs --plugin ./node_modules/ts-pegjs/src/tspegjs --allowed-start-rules start,declaration -o src/js/parse/cpp_parser.ts other/grammar.txt
```