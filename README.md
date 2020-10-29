# IncomeContract
Implements UBI and other types of income, used to claim currency in other external contracts

# Deploy
when deploy it is need to pass parameters in to constructor
Params:
name  | type | description
--|--|--
token|address|token's address. if token = address(0) then contract will trying to claim ETH

# Overview
once installed will be use methods:

## Methods

#### addRecipient
adding recipient to contract. Only for Owner
Params:
name  | type | description
--|--|--
recipient|address|recipient's address

#### setLockup
lockups for recipient. Only for Owner
Params:
name  | type | description
--|--|--
recipient|address|recipient's address
restrictions|tuple[]| array or RestrictParam tuples

RestrictParam tuple
name  | type | description
--|--|--
amount|uint256|amount
untilTime|uint256|time in unixtimestamp
gradual|bool|gradual

#### addManager
adding manager to recipient. Only for Owner
Params:
name  | type | description
--|--|--
recipient|address|recipient's address
manager|address|manager's address

#### removeManager
removing manager from recipient. Only for Owner
Params:
name  | type | description
--|--|--
recipient|address|recipient's address
manager|address|manager's address

#### pay
setup allowed amount to recipient claim
Params:
name  | type | description
--|--|--
recipient|address|recipient's address
amount|uint256|amount

#### claim
call by recipient to claim funds

#### viewLockup
Params:
name  | type | description
--|--|--
recipient|address|recipient's address

Returned params:
name  | type | description
--|--|--

maximum|uint256|maximum funds that was setup by owner
payed|uint256|already paid funds. mean that recipient already claimed them
locked|uint256|fudns that restricted by owner
allowedByManager|uint256|funds allowed by manager. recipient can claim them

## Lifecycle of IncomeContract 
Create IncomeContract with param 'token' = <0x0000000000000000000000000000000000000000>. That mean that contract  will be work with ethers.  And send some ethers to IncomeContract.
*   so owner want to pay some recipient 10eth per week for 2 months(8 weeks). Need to do several steps:
    * add recipient by invoking method `addRecipient(<recipient address>)`
    * add manager to recipient by invoking method `addManager(<recipient address>,<manager address>)`
    * setup restriction. invoke method `setLockup(<recipient address>, <array or restriction's tuples>)`. one tuple is [amount,untilTime,gradual].
So it will be smth like this 
[
[<10e18>,<time_now + 1week in seconds>, false],
[<10e18>,<time_now + 2week in seconds>, false],
[<10e18>,<time_now + 3week in seconds>, false],
[<10e18>,<time_now + 4week in seconds>, false],
[<10e18>,<time_now + 5week in seconds>, false],
[<10e18>,<time_now + 6week in seconds>, false],
[<10e18>,<time_now + 7week in seconds>, false],
[<10e18>,<time_now + 8week in seconds>, false]
]
    * after this, every week will be available by 10 eth and manager can pay (setup allowed amount to claim) to recipient any funds of available. 
    * after passing 2 weeks. available by owner 20eth. manager can `pay` not more that 20eth. for example he invoking method `pay(<recipient address>,<12e18>)`.  reciepient can claim only 12 eth
