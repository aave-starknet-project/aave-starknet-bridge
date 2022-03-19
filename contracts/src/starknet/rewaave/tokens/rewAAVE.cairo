# SPDX-License-Identifier: MIT
# OpenZeppelin Cairo Contracts v0.1.0 (token/erc20/ERC20_Mintable.cairo)

%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.cairo.common.uint256 import Uint256

from openzeppelin.token.erc20.library import (
<<<<<<< HEAD
    ERC20_name, ERC20_symbol, ERC20_totalSupply, ERC20_decimals, ERC20_balanceOf, ERC20_allowance,
    ERC20_initializer, ERC20_approve, ERC20_increaseAllowance, ERC20_decreaseAllowance,
    ERC20_transfer, ERC20_transferFrom, ERC20_mint)

from openzeppelin.access.ownable import Ownable_initializer, Ownable_only_owner
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

from openzeppelin.utils.constants import TRUE

@constructor
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
func name{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (name : felt):
=======
func name{
        syscall_ptr : felt*,
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }() -> (name: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
    let (name) = ERC20_name()
    return (name)
end

@view
<<<<<<< HEAD
func symbol{syscall_ptr : felt*, pedersen_ptr : HashBuiltin*, range_check_ptr}() -> (symbol : felt):
=======
func symbol{
        syscall_ptr : felt*,
        pedersen_ptr : HashBuiltin*,
        range_check_ptr
    }() -> (symbol: felt):
>>>>>>> f1627eb... Basic implementation of staticAToken and rewards collection
    let (symbol) = ERC20_symbol()
    return (symbol)
end

@view
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
    return (totalSupply)
end

@view
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
    let (decimals) = ERC20_decimals()
    return (decimals)
end

@view
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
    return (balance)
end

@view
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
    return (remaining)
end

#
# Externals
#

@external
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
    ERC20_transfer(recipient, amount)
    return (TRUE)
end

@external
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
    ERC20_transferFrom(sender, recipient, amount)
    return (TRUE)
end

@external
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
    ERC20_approve(spender, amount)
    return (TRUE)
end

@external
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
    ERC20_increaseAllowance(spender, added_value)
    return (TRUE)
end

@external
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
    ERC20_decreaseAllowance(spender, subtracted_value)
    return (TRUE)
end

@external
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
    Ownable_only_owner()
    ERC20_mint(to, amount)
    return ()
end
