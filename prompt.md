/csa-sdlc:execute

# game play mechanics

okay now that the game board is done, i want to build the game play.

there will be multiple scenarios in this game. we will only focus on 1 scenario in this round.
we will need a main page that allows you to choose scenarios.

CAN YOU TRY AND ARCHITECT THE GAMEPLAY SUCH THAT IT IS EASY TO ADD MORE SCENARIOS IN THE FUTURE?

the game play loop will be like this.

you recieve a ticket (PLEASE NOTE THAT TICKETS ARE JUST REQUESTS. DO NOT HINT THE USER AS TO WHAT THEY SHOULD DO.)

"hey rockstar, bossman wants to host their website on the internet. I don't know what those funny words mean, but I trust you can get it done~"
i dont know how this ticket will render on the page. collapsible or not, on the top?

anyways the user is now supposed to try and architect this solution out on the gameboard by dragging aws icons into the relvant subnets and linking them up.

there should be a "submit" button somewhere on the page.
The submit button will maybe play a little animation of "multiple traffic" flowing from the internet through the IGW and whatever nodes the user configured.

TICKETS ARE BUILT ON TOP OF EACH OTHER. so I cannot just have a single waf and expect to pass? i want to make sure that their design has to pass all previous cases as well

There are multiple answers to each problem. for example for this problem, the user can put a frontend ec2 (in whatever subnet) frontend ecs in whatever subnet. etc etc. (im not too sure if whatever subnet matters but you get the idea.) they can even build a full solution with waf alb asg whatever.

I think after the testing page, a modal will appear explaining if they passed or failed the test. there will also be a bunch of "objectives" that hint at good practices

the optional objectives i am specifying are just stuff i have thought of. please feel free to add other stuff

i.e frontend in the public subnet, backend in the private subnet. 

these objectives do not need to be met to proceed on to the next ticket.

also add a try again button so that they can re-edit their design to maybe hit all the objectives.

next ticket

"hey rockstar, bossman really liked your design man! but they realised it doesnt do anything. They were asking for some backend apis? whatever that means. Anyways get to it~"

user needs to drag a backend ec2 / ecs
join frontend and backend
optional objective frontend ec2 / ecs on the public subnet. backend ec2 / ecs onn the private subnet.

next ticket

"hey rockstar, bossman really likes the ehh-pee-eye that you built. Really some cutting-edge shit. Now he is wondering if he can get in on some of that database hype he has been hearing about."

user needs to drag rds into the picture
join backend and rds
optional task, rds is in the private subent

next ticket

"hey rockstar, bossman suspects that his sparkling water is going to be all the rage this black friday. people are going to be swamping the site to get some of that spicy water... would be a shame if the site crashes."

user needs to add in some form of scaling my guess is alb asg.
would be cool if the submit button traffic animation shows traffic splitting at the asg into the frontend and backend.

last ticket

"hey rockstar, bossman has been doing some shady shit recently... real sussy baka... anyways i heard that a couple of hackers are targeting him so we might want to lock shit down if you know what i mean."

user needs to add a waf
probably should be right at the very start?

my aws architecting is bad so
i think the final solution should look something like

internet > igw > (public subnet) > waf > alb > asg > frontend ec2 / ecs
                                               asg > private subnet > backend ecs / ecs > rds

if this looks correct, I am thinking of having a hidden /answer path for each scenario so that we can secretly reference what the final architecture should look like.

also as a sanity test of the engine, technically speaking if i architect the final answer at the start, i should be able to pass all the tests.

what do you think?


side note, do you think there is an easy way for me to delete edges?