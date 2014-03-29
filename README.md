#INFOMETER

* Chrome extension that helps you measure how much of a web page you have read.
* This extension provides a progress bar at the top of a web page and two markers to delimit the content area that you want to read when you click on its icon.

![Alt text](https://raw.githubusercontent.com/eloone/chrome-infometer/master/images/screenshot1.png)

##Pitch

When you read lengthy in depth and very interesting articles online, haven't you ever been annoyed that it is caught between totally useless content like ads and comments? You start reading and it seems that the page never ends. Instead of focusing on reading, you keep wondering, "Man, how much left is there to read? I don't have the time to read a novel right now!" So you find yourself peeking at the scrollbar on the right, but it is so tiny, it looks like the page is very very long. Oh no.

So slowly you get discouraged but you keep reading, still calculating how much is left from the scrollbar, and then without any further notice, you hit the end of the article, but the scrollbar is still at the top! What? 

In fact, there is a troup of comments at the bottom of the article along with ads and all that stuff taking 80% of the page ! The scrollbar was totally useless to show you how much left there was to read.

That's when Infometer comes to the rescue. Infometer acts as an information measurer that gives you the same visual clue as the scrollbar about your progress in reading a web page except that you can delimit the specific content to measure.

![Alt text](https://raw.githubusercontent.com/eloone/chrome-infometer/master/images/screenshot5.png)

##Usage

Next time you read seemingly lengthy content :
 1. First evaluate how much there is really to read
 2. Click on the Infometer's icon
 3. Click on the markers to mark the begining and the end of the "real" content
 4. Just read and stop calculating

It will ease your online reading experience as you will read faster and with more focus once you know how much exactly you need to read in a web page.

##Features

* Synces with Chrome Sync.
* If Chrome Sync is not active it will remember the position of your markers only on the current computer.
* Has 4 status :
    * ON : the extension's markup is in the web page.
    * OFF (grey) : the extension is not activated for the current page.
    * OFF (red) : some pages are not typical web pages like the chrome:// pages or the chrome webstore pages that forbid any interaction with extensions. On those pages Infometer can't work.
    * ERR : sometimes if a tab has been opened for too long, you have to reload it to activate the extension again.

##Architecture

* `front` contains the content scripts injected in the client page.
* `back` contains the background scripts used by the extension to store, activate, and react on user input. 

##Next versions

* Automatically detect "real" content
* Implement themes

##Graphic design friends

Graphic design is not my thing. However I love great design. If you are yourself a design queen or king and you want to see your design up there in the extension, you can ! Just work in the `prototype` folder of this repository with the `main.css` and `index.html` files and I will add your design as soon as the theme feature is ready. 

