# SPDX-License-Identifier: MIT
# OpenZeppelin Cairo Contracts v0.1.0 (token/erc20/ERC20_Mintable.cairo)

%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.uint256 import Uint256

from openzeppelin.token.erc20.library import (
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> e1ebfe9... Formatting
=======
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    ERC20_name, ERC20_symbol, ERC20_totalSupply, ERC20_decimals, ERC20_balanceOf, ERC20_allowance,
    ERC20_initializer, ERC20_approve, ERC20_increaseAllowance, ERC20_decreaseAllowance,
    ERC20_transfer, ERC20_transferFrom, ERC20_mint)

from openzeppelin.access.ownable import Ownable_initializer, Ownable_only_owner
<<<<<<< HEAD
<<<<<<< HEAD
=======
    ERC20_name,
    ERC20_symbol,
    ERC20_totalSupply,
    ERC20_decimals,
    ERC20_balanceOf,
    ERC20_allowance,

    ERC20_initializer,
    ERC20_approve,
    ERC20_increaseAllowance,
    ERC20_decreaseAllowance,
    ERC20_transfer,
    ERC20_transferFrom,
    ERC20_mint
)

from openzeppelin.access.ownable import (
    Ownable_initializer,
    Ownable_only_owner
)
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
>>>>>>> e1ebfe9... Formatting
=======
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9

from openzeppelin.utils.constants import TRUE

@constructor
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func constructor{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        name : felt, symbol : felt, decimals : felt, initial_supply : Uint256, recipient : felt,
        owner : felt):
=======
func constructor{
        syscall_ptr: felt*, 
        pedersen_ptr: HashBuiltin*,
        range_check_ptr
    }(
        name: felt,
        symbol: felt,
        decimals: felt,
        initial_supply: Uint256,
        recipient: felt,
        owner: felt
    ):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func constructor{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        name : felt, symbol : felt, decimals : felt, initial_supply : Uint256, recipient : felt,
        owner : felt):
>>>>>>> e1ebfe9... Formatting
=======
func constructor{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        name : felt, symbol : felt, decimals : felt, initial_supply : Uint256, recipient : felt,
        owner : felt):
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    ERC20_initializer(name, symbol, decimals)
    ERC20_mint(recipient, initial_supply)
    Ownable_initializer(owner)
    return ()
end

#
# Getters
#

@view
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func name{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (name : felt):
=======
func name{
        syscall_ptr : felt*,
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }() -> (name: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func name{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (name : felt):
>>>>>>> e1ebfe9... Formatting
=======
func name{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (name : felt):
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    let (name) = ERC20_name()
    return (name)
end

@view
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func symbol{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (symbol : felt):
=======
func symbol{
        syscall_ptr : felt*,
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }() -> (symbol: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func symbol{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (symbol : felt):
>>>>>>> e1ebfe9... Formatting
=======
func symbol{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (symbol : felt):
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    let (symbol) = ERC20_symbol()
    return (symbol)
end

@view
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func totalSupply{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        totalSupply : Uint256):
    let (totalSupply : Uint256) = ERC20_totalSupply()
=======
func totalSupply{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }() -> (totalSupply: Uint256):
    let (totalSupply: Uint256) = ERC20_totalSupply()
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func totalSupply{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        totalSupply : Uint256):
    let (totalSupply : Uint256) = ERC20_totalSupply()
>>>>>>> e1ebfe9... Formatting
=======
func totalSupply{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        totalSupply : Uint256):
    let (totalSupply : Uint256) = ERC20_totalSupply()
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    return (totalSupply)
end

@view
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func decimals{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        decimals : felt):
=======
func decimals{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }() -> (decimals: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func decimals{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        decimals : felt):
>>>>>>> e1ebfe9... Formatting
=======
func decimals{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (
        decimals : felt):
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    let (decimals) = ERC20_decimals()
    return (decimals)
end

@view
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func balanceOf{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        account : felt) -> (balance : Uint256):
    let (balance : Uint256) = ERC20_balanceOf(account)
=======
func balanceOf{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(account: felt) -> (balance: Uint256):
    let (balance: Uint256) = ERC20_balanceOf(account)
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func balanceOf{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        account : felt) -> (balance : Uint256):
    let (balance : Uint256) = ERC20_balanceOf(account)
>>>>>>> e1ebfe9... Formatting
=======
func balanceOf{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        account : felt) -> (balance : Uint256):
    let (balance : Uint256) = ERC20_balanceOf(account)
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    return (balance)
end

@view
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func allowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        owner : felt, spender : felt) -> (remaining : Uint256):
    let (remaining : Uint256) = ERC20_allowance(owner, spender)
=======
func allowance{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(owner: felt, spender: felt) -> (remaining: Uint256):
    let (remaining: Uint256) = ERC20_allowance(owner, spender)
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func allowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        owner : felt, spender : felt) -> (remaining : Uint256):
    let (remaining : Uint256) = ERC20_allowance(owner, spender)
>>>>>>> e1ebfe9... Formatting
=======
func allowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        owner : felt, spender : felt) -> (remaining : Uint256):
    let (remaining : Uint256) = ERC20_allowance(owner, spender)
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    return (remaining)
end

#
# Externals
#

@external
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func transfer{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        recipient : felt, amount : Uint256) -> (success : felt):
=======
func transfer{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(recipient: felt, amount: Uint256) -> (success: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func transfer{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        recipient : felt, amount : Uint256) -> (success : felt):
>>>>>>> e1ebfe9... Formatting
=======
func transfer{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        recipient : felt, amount : Uint256) -> (success : felt):
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    ERC20_transfer(recipient, amount)
    return (TRUE)
end

@external
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func transferFrom{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        sender : felt, recipient : felt, amount : Uint256) -> (success : felt):
=======
func transferFrom{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(
        sender: felt, 
        recipient: felt, 
        amount: Uint256
    ) -> (success: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func transferFrom{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        sender : felt, recipient : felt, amount : Uint256) -> (success : felt):
>>>>>>> e1ebfe9... Formatting
=======
func transferFrom{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        sender : felt, recipient : felt, amount : Uint256) -> (success : felt):
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    ERC20_transferFrom(sender, recipient, amount)
    return (TRUE)
end

@external
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func approve{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, amount : Uint256) -> (success : felt):
=======
func approve{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(spender: felt, amount: Uint256) -> (success: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func approve{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, amount : Uint256) -> (success : felt):
>>>>>>> e1ebfe9... Formatting
=======
func approve{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, amount : Uint256) -> (success : felt):
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    ERC20_approve(spender, amount)
    return (TRUE)
end

@external
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func increaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, added_value : Uint256) -> (success : felt):
=======
func increaseAllowance{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(spender: felt, added_value: Uint256) -> (success: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func increaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, added_value : Uint256) -> (success : felt):
>>>>>>> e1ebfe9... Formatting
=======
func increaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, added_value : Uint256) -> (success : felt):
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    ERC20_increaseAllowance(spender, added_value)
    return (TRUE)
end

@external
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func decreaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, subtracted_value : Uint256) -> (success : felt):
=======
func decreaseAllowance{
        syscall_ptr : felt*, 
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }(spender: felt, subtracted_value: Uint256) -> (success: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func decreaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, subtracted_value : Uint256) -> (success : felt):
>>>>>>> e1ebfe9... Formatting
=======
func decreaseAllowance{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        spender : felt, subtracted_value : Uint256) -> (success : felt):
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    ERC20_decreaseAllowance(spender, subtracted_value)
    return (TRUE)
end

@external
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
func mint{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        to : felt, amount : Uint256):
=======
func mint{
        syscall_ptr: felt*,
        pedersen_ptr: HashBuiltin*,
        range_check_ptr
    }(to: felt, amount: Uint256):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
=======
func mint{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        to : felt, amount : Uint256):
>>>>>>> e1ebfe9... Formatting
=======
func mint{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}(
        to : felt, amount : Uint256):
>>>>>>> d219ee6d158413ea3ab958ab0c964ff79eb49ca9
    Ownable_only_owner()
    ERC20_mint(to, amount)
    return ()
end
